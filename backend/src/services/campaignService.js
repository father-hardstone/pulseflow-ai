const config = require("../config");
const { httpError } = require("../helpers/errors");
const { requireConfig } = require("../helpers/requireConfig");
const { store } = require("../store");
const apolloUsage = require("./apolloUsageService");
const { probePeopleSearchAccess } = require("./apolloProbeService");
const { resolveInboundLead, probeOrganizationEnrich } = require("./apolloEnrichmentService");
const { probeHunterAccess } = require("./hunterProbeService");
const { prospectLeads } = require("./hunterProspectingService");
const { generateForLead } = require("./outreachService");

async function launchInboundEnrichment({ userId, objective = "", domain, inboundEmail, tone }) {
  requireConfig("apollo");

  const enrichProbe = await probeOrganizationEnrich();
  if (!enrichProbe.accessible) {
    throw httpError(503, enrichProbe.message || "Apollo organization enrich is not available.", {
      code: "APOLLO_ENRICH_INACCESSIBLE",
      enrichProbe,
    });
  }

  const usage = await apolloUsage.getUsage(userId);
  if (usage.userRemaining <= 0 || usage.globalRemaining <= 0) {
    throw httpError(429, "Monthly lead quota exhausted.", { code: "APOLLO_QUOTA_EXCEEDED", usage });
  }

  const { lead, enrichment } = await resolveInboundLead({ domain, inboundEmail });
  const [inserted] = await store.insertLeads(userId, [lead]);
  const result = await generateForLead({
    userId,
    leadId: inserted.id,
    objective,
    enrichment,
    tone,
  });

  return {
    launched: true,
    mode: "inbound_enrichment",
    enrichment: enrichment.summary,
    lead: result.lead,
    meta: result.meta,
    apollo: {
      appliedLimit: 1,
      usage: {
        userUsed: usage.userUsed + 1,
        globalUsed: usage.globalUsed + 1,
        userRemaining: Math.max(0, usage.userRemaining - 1),
        globalRemaining: Math.max(0, usage.globalRemaining - 1),
        limits: usage.limits,
      },
    },
  };
}

// n8n + Apollo People Search (requires paid Apollo API).
async function launchProspectingCampaign({ userId, filters = {}, objective = "", tone }) {
  requireConfig("n8n");

  const apolloApi = await probePeopleSearchAccess();
  if (!apolloApi.accessible) {
    throw httpError(
      503,
      apolloApi.message ||
        "Apollo People Search is not on your plan. Use inbound domain or email enrichment instead.",
      { code: "APOLLO_API_INACCESSIBLE", apolloApi }
    );
  }

  const usage = await apolloUsage.getUsage(userId);
  apolloUsage.requireTargetingFilters(filters);

  const requestedLimit = filters.limit;
  const limit = apolloUsage.resolveCampaignLimit(requestedLimit, usage);
  const clampedFilters = { ...filters, limit };

  let res;
  try {
    res = await fetch(config.n8n.launchWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "launch_campaign",
        userId,
        objective,
        filters: clampedFilters,
      }),
    });
  } catch (err) {
    throw httpError(502, `Could not reach n8n webhook: ${err.message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let hint = "";
    try {
      const parsed = JSON.parse(text);
      if (res.status === 404 && parsed?.message) {
        hint =
          " Import `backend/n8n/pulseflow-campaign.workflow.json` into n8n and turn the workflow **Active**.";
        if (parsed.hint) hint += ` n8n: ${parsed.hint}`;
      }
    } catch {
      /* not JSON */
    }
    throw httpError(502, `n8n webhook returned ${res.status}${hint}`, { body: text.slice(0, 300) });
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* webhook may return no body */
  }

  return {
    launched: true,
    mode: "prospecting",
    n8n: data,
    apollo: {
      requestedLimit: requestedLimit ?? null,
      appliedLimit: limit,
      usage: {
        userUsed: usage.userUsed,
        globalUsed: usage.globalUsed,
        userRemaining: Math.max(0, usage.userRemaining - limit),
        globalRemaining: Math.max(0, usage.globalRemaining - limit),
        limits: usage.limits,
      },
    },
  };
}

async function launchHunterProspecting({ userId, filters = {}, objective = "", tone }) {
  requireConfig("hunter");

  const hunterApi = await probeHunterAccess();
  if (!hunterApi.accessible) {
    throw httpError(503, hunterApi.message || "Hunter.io is not available.", {
      code: "HUNTER_API_INACCESSIBLE",
      hunterApi,
    });
  }

  const usage = await apolloUsage.getUsage(userId);
  apolloUsage.requireTargetingFilters(filters);

  const requestedLimit = filters.limit;
  const limit = apolloUsage.resolveCampaignLimit(requestedLimit, usage);
  const { leads, enrichments } = await prospectLeads(filters, limit);

  const inserted = await store.insertLeads(userId, leads);
  const results = [];

  for (let i = 0; i < inserted.length; i += 1) {
    const leadRow = inserted[i];
    const enrichment = enrichments[i] || enrichments[0];
    // eslint-disable-next-line no-await-in-loop
    const result = await generateForLead({
      userId,
      leadId: leadRow.id,
      objective,
      enrichment,
      tone,
    });
    results.push(result.lead);
  }

  return {
    launched: true,
    mode: "hunter_prospecting",
    leads: results,
    hunter: { appliedLimit: limit, plan: hunterApi.plan },
    apollo: {
      appliedLimit: limit,
      usage: {
        userUsed: usage.userUsed + inserted.length,
        globalUsed: usage.globalUsed + inserted.length,
        userRemaining: Math.max(0, usage.userRemaining - inserted.length),
        globalRemaining: Math.max(0, usage.globalRemaining - inserted.length),
        limits: usage.limits,
      },
    },
  };
}

async function launchCampaign({
  userId,
  filters = {},
  objective = "",
  domain,
  inboundEmail,
  tone,
  prospectProvider = "apollo",
}) {
  requireConfig("apollo");

  const domainNorm = domain ? String(domain).trim() : "";
  const emailNorm = inboundEmail ? String(inboundEmail).trim() : "";

  if (domainNorm || emailNorm) {
    return launchInboundEnrichment({
      userId,
      objective,
      domain: domainNorm || undefined,
      inboundEmail: emailNorm || undefined,
      tone,
    });
  }

  return prospectProvider === "hunter"
    ? launchHunterProspecting({ userId, filters, objective, tone })
    : launchProspectingCampaign({ userId, filters, objective, tone });
}

module.exports = {
  launchCampaign,
  launchInboundEnrichment,
  launchProspectingCampaign,
  launchHunterProspecting,
};
