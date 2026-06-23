const { createClient } = require("@supabase/supabase-js");
const config = require("../config");

// Supabase-backed store. Activated when SUPABASE_URL + a key are present.
// Expects the schema/RPC from `backend/db/schema.sql` to be applied.
function createSupabaseStore() {
  const client = createClient(config.supabase.url, config.supabase.key, {
    auth: { persistSession: false },
  });

  function unwrap({ data, error }) {
    if (error) {
      const err = new Error(error.message || "Supabase error");
      err.status = 502;
      err.code = "SUPABASE_ERROR";
      err.details = error;
      throw err;
    }
    return data;
  }

  return {
    kind: "supabase",
    client,

    // ----- app_users (auth) -----
    async createUser({ email, passwordHash, fullName }) {
      return unwrap(
        await client
          .from("app_users")
          .insert({ email, password_hash: passwordHash, full_name: fullName || null })
          .select("id, email, full_name, llm_provider, created_at")
          .single()
      );
    },

    async getUserByEmail(email) {
      return unwrap(
        await client.from("app_users").select("*").eq("email", email).maybeSingle()
      );
    },

    async getUserById(id) {
      return unwrap(
        await client
          .from("app_users")
          .select("id, email, full_name, is_active, llm_provider, demo_email_target, created_at")
          .eq("id", id)
          .maybeSingle()
      );
    },

    // ----- app_admins -----
    async createAdmin({ email, passwordHash, fullName, role = "admin" }) {
      return unwrap(
        await client
          .from("app_admins")
          .insert({
            email,
            password_hash: passwordHash,
            full_name: fullName || null,
            role,
          })
          .select("id, email, full_name, role, is_active, created_at")
          .single()
      );
    },

    async getAdminByEmail(email) {
      return unwrap(
        await client.from("app_admins").select("*").eq("email", email).maybeSingle()
      );
    },

    async getAdminById(id) {
      return unwrap(
        await client
          .from("app_admins")
          .select("id, email, full_name, role, is_active, created_at")
          .eq("id", id)
          .maybeSingle()
      );
    },

    async countAdmins() {
      const { count, error } = await client
        .from("app_admins")
        .select("*", { count: "exact", head: true });
      if (error) throw Object.assign(new Error(error.message), { status: 502 });
      return count || 0;
    },

    async updateAdmin(id, patch) {
      return unwrap(
        await client.from("app_admins").update(patch).eq("id", id).select().single()
      );
    },

    async listAdmins() {
      return unwrap(
        await client
          .from("app_admins")
          .select("id, email, full_name, role, is_active, created_at")
          .order("created_at", { ascending: false })
      );
    },

    // ----- admin platform views -----
    async listAllUsers() {
      return this.listAllUsersWithStats();
    },

    async listAllUsersWithStats() {
      const users = unwrap(
        await client
          .from("app_users")
          .select("id, email, full_name, is_active, llm_provider, created_at")
          .order("created_at", { ascending: false })
      );

      const [leadRows, kbRows] = await Promise.all([
        client.from("leads_campaign").select("user_id, status"),
        client.from("knowledge_base").select("user_id, id"),
      ]);

      const leads = leadRows.data || [];
      const knowledge = kbRows.data || [];

      const leadByUser = {};
      for (const row of leads) {
        if (!leadByUser[row.user_id]) {
          leadByUser[row.user_id] = { total: 0, completed: 0, failed: 0, processing: 0, pending: 0 };
        }
        const bucket = leadByUser[row.user_id];
        bucket.total += 1;
        if (row.status === "completed") bucket.completed += 1;
        else if (row.status === "failed") bucket.failed += 1;
        else if (row.status === "processing") bucket.processing += 1;
        else bucket.pending += 1;
      }

      const kbByUser = {};
      for (const row of knowledge) {
        kbByUser[row.user_id] = (kbByUser[row.user_id] || 0) + 1;
      }

      return (users || []).map((u) => {
        const ls = leadByUser[u.id] || {
          total: 0,
          completed: 0,
          failed: 0,
          processing: 0,
          pending: 0,
        };
        return {
          ...u,
          stats: {
            knowledgeCount: kbByUser[u.id] || 0,
            leadCount: ls.total,
            outreachRuns: ls.total,
            leadsCompleted: ls.completed,
            leadsFailed: ls.failed,
            leadsPending: ls.pending + ls.processing,
          },
        };
      });
    },

    async getUserWithStats(id) {
      const user = await this.getUserById(id);
      if (!user) return null;
      const [knowledge, leads] = await Promise.all([
        this.listKnowledge(id),
        this.listLeads(id),
      ]);
      return {
        ...user,
        stats: {
          knowledgeCount: knowledge.length,
          chunkCount: knowledge.reduce((s, k) => s + (k.chunk_count || 0), 0),
          leadCount: leads.length,
        },
      };
    },

    async updateUser(id, patch) {
      return unwrap(
        await client.from("app_users").update(patch).eq("id", id).select().single()
      );
    },

    async deleteUser(id) {
      const { error } = await client.from("app_users").delete().eq("id", id);
      if (error) throw Object.assign(new Error(error.message), { status: 502 });
      return true;
    },

    // ----- demo email (Mailtrap sandbox vs Resend → test inboxes) -----
    async listDemoRecipients(userId) {
      return unwrap(
        await client
          .from("user_demo_recipients")
          .select("id, first_name, last_name, email, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
      );
    },

    async countDemoRecipients(userId) {
      const { count, error } = await client
        .from("user_demo_recipients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw Object.assign(new Error(error.message), { status: 502 });
      return count || 0;
    },

    async insertDemoRecipient(userId, { firstName, lastName, email }) {
      return unwrap(
        await client
          .from("user_demo_recipients")
          .insert({
            user_id: userId,
            first_name: firstName || "",
            last_name: lastName || "",
            email,
          })
          .select("id, first_name, last_name, email, created_at")
          .single()
      );
    },

    async updateDemoRecipient(userId, id, patch) {
      const row = unwrap(
        await client
          .from("user_demo_recipients")
          .update(patch)
          .eq("id", id)
          .eq("user_id", userId)
          .select("id, first_name, last_name, email, created_at")
          .single()
      );
      return row;
    },

    async deleteDemoRecipient(userId, id) {
      const { error } = await client
        .from("user_demo_recipients")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw Object.assign(new Error(error.message), { status: 502 });
      return true;
    },

    async listAllKnowledge() {
      const rows = unwrap(
        await client
          .from("knowledge_base")
          .select("*, document_chunks(count), app_users(email, full_name)")
          .order("created_at", { ascending: false })
      );
      return (rows || []).map((r) => ({
        ...r,
        chunk_count: r.document_chunks?.[0]?.count ?? 0,
        owner_email: r.app_users?.email ?? null,
        owner_name: r.app_users?.full_name ?? null,
      }));
    },

    async listAllLeads() {
      const rows = unwrap(
        await client
          .from("leads_campaign")
          .select("*, app_users(email, full_name)")
          .order("created_at", { ascending: false })
      );
      return (rows || []).map((r) => ({
        ...r,
        owner_email: r.app_users?.email ?? null,
        owner_name: r.app_users?.full_name ?? null,
      }));
    },

    async deleteLead(id) {
      const { error } = await client.from("leads_campaign").delete().eq("id", id);
      if (error) throw Object.assign(new Error(error.message), { status: 502 });
      return true;
    },

    async getPlatformStats() {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const monthIso = monthStart.toISOString();

      const [usersRes, activeRes, newMonthRes, knowledge, leads, admins, chunks] =
        await Promise.all([
          client.from("app_users").select("*", { count: "exact", head: true }),
          client
            .from("app_users")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),
          client
            .from("app_users")
            .select("*", { count: "exact", head: true })
            .gte("created_at", monthIso),
          client.from("knowledge_base").select("*", { count: "exact", head: true }),
          client.from("leads_campaign").select("user_id, status"),
          client.from("app_admins").select("*", { count: "exact", head: true }),
          client.from("document_chunks").select("*", { count: "exact", head: true }),
        ]);

      const leadRows = leads.data || [];
      const leadsByStatus = leadRows.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {});

      const usersWithOutreach = new Set(leadRows.map((l) => l.user_id)).size;
      const usersWithKnowledge = unwrap(
        await client.from("knowledge_base").select("user_id")
      );
      const usersWithKb = new Set((usersWithKnowledge || []).map((k) => k.user_id)).size;

      return {
        userCount: usersRes.count || 0,
        activeUserCount: activeRes.count || 0,
        inactiveUserCount: Math.max(0, (usersRes.count || 0) - (activeRes.count || 0)),
        newUsersThisMonth: newMonthRes.count || 0,
        usersWithOutreach,
        usersWithKnowledge: usersWithKb,
        adminCount: admins.count || 0,
        knowledgeCount: knowledge.count || 0,
        chunkCount: chunks.count || 0,
        leadCount: leadRows.length,
        outreachRuns: leadRows.length,
        leadsCompleted: leadsByStatus.completed || 0,
        leadsFailed: leadsByStatus.failed || 0,
        leadsPending: (leadsByStatus.pending || 0) + (leadsByStatus.processing || 0),
        leadsByStatus,
      };
    },

    async listKnowledge(userId) {
      const rows = unwrap(
        await client
          .from("knowledge_base")
          .select("*, document_chunks(count)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      );
      return (rows || []).map((r) => ({
        ...r,
        chunk_count: r.document_chunks?.[0]?.count ?? 0,
      }));
    },

    async createKnowledge({ userId, title, sourceUrl, status = "processing", sourceType = "text" }) {
      return unwrap(
        await client
          .from("knowledge_base")
          .insert({ user_id: userId, title, source_url: sourceUrl, source_type: sourceType, status })
          .select()
          .single()
      );
    },

    async getKnowledge(id) {
      return unwrap(await client.from("knowledge_base").select("*").eq("id", id).maybeSingle());
    },

    async updateKnowledge(id, patch) {
      return unwrap(
        await client.from("knowledge_base").update(patch).eq("id", id).select().single()
      );
    },

    async deleteKnowledge(id) {
      unwrap(await client.from("knowledge_base").delete().eq("id", id));
      return true;
    },

    async insertChunks(kbId, chunks) {
      const rows = chunks.map((c) => ({ kb_id: kbId, content: c.content, embedding: c.embedding }));
      unwrap(await client.from("document_chunks").insert(rows));
      return rows.length;
    },

    async searchChunks(userId, embedding, topK = 2) {
      const rows = unwrap(
        await client.rpc("match_document_chunks", {
          query_embedding: embedding,
          match_count: topK,
          p_user_id: userId,
        })
      );
      return (rows || []).map((r) => ({
        kb_id: r.kb_id,
        content: r.content,
        similarity: r.similarity,
      }));
    },

    async listLeads(userId) {
      return unwrap(
        await client
          .from("leads_campaign")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      );
    },

    async countLeadsSince(isoDate, userId = null) {
      let q = client
        .from("leads_campaign")
        .select("*", { count: "exact", head: true })
        .gte("created_at", isoDate);
      if (userId) q = q.eq("user_id", userId);
      const { count, error } = await q;
      if (error) throw Object.assign(new Error(error.message), { status: 502 });
      return count || 0;
    },

    async insertLeads(userId, leads) {
      const rows = leads.map((lead) => ({
        user_id: userId,
        first_name: lead.first_name || "",
        last_name: lead.last_name || "",
        email: lead.email || "",
        company_name: lead.company_name || "",
        job_title: lead.job_title || "",
        industry: lead.industry || "",
        status: "pending",
      }));
      return unwrap(await client.from("leads_campaign").insert(rows).select());
    },

    async getLead(id) {
      return unwrap(await client.from("leads_campaign").select("*").eq("id", id).maybeSingle());
    },

    async updateLead(id, patch) {
      return unwrap(
        await client.from("leads_campaign").update(patch).eq("id", id).select().single()
      );
    },

    async clearLeads(userId) {
      unwrap(await client.from("leads_campaign").delete().eq("user_id", userId));
      return true;
    },
  };
}

module.exports = { createSupabaseStore };
