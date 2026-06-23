#!/usr/bin/env node
/**
 * Black-box smoke test for the outreach brain (RAG + LLM worker).
 *
 * Usage:
 *   SMOKE_EMAIL=you@example.com SMOKE_PASSWORD=secret npm run smoke:outreach --workspace backend
 *
 * Optional:
 *   SMOKE_BASE_URL=http://localhost:3000
 *   SMOKE_SKIP_CAMPAIGN=1   — skip n8n launch (worker + manual generate only)
 */
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const BASE = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
let email = process.env.SMOKE_EMAIL || "";
let password = process.env.SMOKE_PASSWORD || "";
const WORKER_SECRET = process.env.WORKER_SHARED_SECRET || "";
const SKIP_CAMPAIGN = process.env.SMOKE_SKIP_CAMPAIGN === "1";

function log(step, msg, extra) {
  const prefix = extra ? `${msg} ${JSON.stringify(extra)}` : msg;
  console.log(`[${step}] ${prefix}`);
}

function fail(step, msg) {
  console.error(`[FAIL:${step}] ${msg}`);
  process.exit(1);
}

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(body?.error || body?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function main() {
  log("1/6", `Health check → ${BASE}/api/health`);
  const health = await request("/api/health");
  const cfg = health.configured || {};
  log("1/6", "Integrations", {
    supabase: cfg.supabase,
    embeddings: cfg.embeddings,
    llm: cfg.llm,
    worker: cfg.worker,
    n8n: cfg.n8n,
    apollo: cfg.apollo,
  });
  if (!cfg.embeddings || !cfg.llm || !cfg.worker) {
    fail("health", "Missing embeddings, LLM, or worker secret — cannot test outreach brain.");
  }

  let auth;
  if (!email || !password) {
    log("2/6", "No SMOKE_EMAIL — creating ephemeral test user");
    const ephemeral = {
      email: `smoke+${Date.now()}@pulseflow.test`,
      password: "SmokeTest123!",
      fullName: "Smoke Test",
    };
    auth = await request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(ephemeral),
    });
    email = ephemeral.email;
    password = ephemeral.password;
  } else {
    log("2/6", "Login");
    auth = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  const token = auth.accessToken;
  const userId = auth.user?.id;
  if (!token || !userId) fail("auth", "Login did not return token/user");

  const authed = (url, opts = {}) =>
    request(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });

  log("3/6", "Knowledge base");
  const kb = await authed("/api/knowledge");
  const kbCount = kb.items?.length || 0;
  log("3/6", `Sources: ${kbCount}, chunks: ${(kb.items || []).reduce((s, i) => s + (i.chunk_count || 0), 0)}`);
  if (kbCount === 0) {
    console.warn("[warn] No knowledge sources — generation will run without RAG context.");
  }

  log("4/6", "Worker generate-outreach (direct black-box)");
  const sampleLead = {
    first_name: "Smoke",
    last_name: "Test",
    email: `smoke+${Date.now()}@example.com`,
    company_name: "Acme SaaS",
    job_title: "VP Sales",
    industry: "Software",
  };
  const workerRes = await request("/api/worker/generate-outreach", {
    method: "POST",
    headers: { "x-worker-secret": WORKER_SECRET },
    body: JSON.stringify({
      userId,
      objective: "Smoke test — book a short product demo",
      lead: sampleLead,
    }),
  });
  if (!workerRes.email?.subject || !workerRes.email?.body) {
    fail("worker", "Worker did not return subject/body", workerRes);
  }
  log("4/6", "Worker OK", {
    leadId: workerRes.lead?.id,
    status: workerRes.lead?.status,
    subject: workerRes.email.subject.slice(0, 60),
    bodyWords: workerRes.email.body.split(/\s+/).length,
    meta: workerRes.meta,
  });

  log("5/6", "JWT generate endpoint (dashboard path)");
  const leadId = workerRes.lead?.id;
  if (!leadId) fail("jwt-generate", "No lead id from worker");

  await authed(`/api/leads/${leadId}/generate`, {
    method: "POST",
    body: JSON.stringify({ objective: "Regenerate smoke test email" }),
  });
  const lead = await authed(`/api/leads/${leadId}`);
  if (!lead.lead?.generated_email) {
    fail("jwt-generate", "Regenerate did not persist email");
  }
  log("5/6", "JWT generate OK", { subject: lead.lead.generated_subject?.slice(0, 60) });

  if (!SKIP_CAMPAIGN && cfg.n8n && cfg.apollo) {
    log("6/6", "Campaign launch (n8n) — limit 1");
    try {
      const launch = await authed("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          jobTitle: "Founder",
          industry: "SaaS",
          location: "United States",
          limit: 1,
          objective: "Smoke test campaign",
        }),
      });
      log("6/6", "Campaign accepted", { appliedLimit: launch.apollo?.appliedLimit });
      console.log("[6/6] Poll Outreach in the dashboard — n8n runs async.");
    } catch (e) {
      console.warn(`[warn] Campaign launch failed (n8n may be offline): ${e.message}`);
    }
  } else {
    log("6/6", "Skipped campaign launch", { skip: SKIP_CAMPAIGN, n8n: cfg.n8n });
  }

  console.log("\n✓ Smoke test passed — outreach brain is working.");
}

main().catch((err) => {
  console.error("\n✗ Smoke test failed:", err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
