const { store } = require("../store");
const { httpError } = require("../helpers/errors");
const { generateForLead } = require("../services/outreachService");
const apolloUsage = require("../services/apolloUsageService");

// Called by n8n (Node 2) after Apollo returns leads. Bulk-inserts as pending.
async function ingestLeads(req, res) {
  const { userId, leads } = req.body || {};
  if (!userId) throw httpError(400, "userId is required");
  if (!Array.isArray(leads) || leads.length === 0) {
    throw httpError(400, "leads[] is required");
  }

  const usage = await apolloUsage.getUsage(userId);
  const allowed = apolloUsage.trimLeadsToQuota(leads, usage);
  const inserted = await store.insertLeads(userId, allowed);
  res.status(201).json({
    ok: true,
    count: inserted.length,
    leads: inserted,
    apollo: {
      received: leads.length,
      stored: inserted.length,
      truncated: leads.length > allowed.length,
    },
  });
}

// Called by n8n per lead: insert + run the LangChain worker, return the email
// so n8n's output node can push it to Gmail/HubSpot/Slack (Module B Node 3).
async function generateOutreach(req, res) {
  const { userId, objective, lead, leadId } = req.body || {};
  if (!userId) throw httpError(400, "userId is required");

  let id = leadId;
  if (!id) {
    if (!lead?.email) throw httpError(400, "lead.email (or leadId) is required");
    const usage = await apolloUsage.getUsage(userId);
    if (usage.userRemaining <= 0 || usage.globalRemaining <= 0) {
      throw httpError(429, "Apollo monthly lead quota exhausted.", {
        code: "APOLLO_QUOTA_EXCEEDED",
        usage,
      });
    }
    const [inserted] = await store.insertLeads(userId, [lead]);
    id = inserted.id;
  }

  const result = await generateForLead({ userId, leadId: id, objective });
  res.status(201).json({
    ok: true,
    lead: result.lead,
    email: {
      to: result.lead.email,
      subject: result.lead.generated_subject,
      body: result.lead.generated_email,
    },
    meta: result.meta,
  });
}

module.exports = { ingestLeads, generateOutreach };
