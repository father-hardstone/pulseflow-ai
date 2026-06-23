const config = require("../config");
const { store } = require("../store");
const { httpError } = require("../helpers/errors");

function monthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function limits() {
  return {
    maxPerCampaign: config.apollo.maxLeadsPerCampaign,
    defaultPerCampaign: config.apollo.defaultLeadsPerCampaign,
    maxPerMonth: config.apollo.maxLeadsPerMonth,
    maxPerUserMonth: config.apollo.maxLeadsPerUserMonth,
  };
}

async function getUsage(userId) {
  const since = monthStartIso();
  const [userUsed, globalUsed] = await Promise.all([
    store.countLeadsSince(since, userId),
    store.countLeadsSince(since),
  ]);

  const caps = limits();
  const userRemaining = Math.max(0, caps.maxPerUserMonth - userUsed);
  const globalRemaining = Math.max(0, caps.maxPerMonth - globalUsed);

  return {
    monthStart: since,
    userUsed,
    globalUsed,
    userRemaining,
    globalRemaining,
    limits: caps,
  };
}

function hasTargetingFilter(filters = {}) {
  return [filters.jobTitle, filters.industry, filters.location, filters.keyword].some(
    (v) => String(v || "").trim().length > 0
  );
}

function requireTargetingFilters(filters = {}) {
  if (!hasTargetingFilter(filters)) {
    throw httpError(
      400,
      "Add at least one search filter (job title, industry, location, or keyword) so Apollo credits are used on a focused audience."
    );
  }
}

function resolveCampaignLimit(requested, usage) {
  const maxAllowed = Math.min(
    config.apollo.maxLeadsPerCampaign,
    usage.userRemaining,
    usage.globalRemaining
  );

  if (maxAllowed <= 0) {
    throw httpError(
      429,
      "Apollo lead quota for this month is exhausted. Raise limits in env or wait until next month.",
      { code: "APOLLO_QUOTA_EXCEEDED", usage }
    );
  }

  const n = Number(requested);
  const want =
    Number.isFinite(n) && n > 0
      ? Math.floor(n)
      : config.apollo.defaultLeadsPerCampaign;

  return Math.min(want, maxAllowed);
}

/** Trim a lead batch to remaining monthly quota (worker safety net). */
function trimLeadsToQuota(leads, usage) {
  const maxAllowed = Math.min(usage.userRemaining, usage.globalRemaining);
  if (maxAllowed <= 0) {
    throw httpError(429, "Apollo monthly lead quota exhausted.", {
      code: "APOLLO_QUOTA_EXCEEDED",
      usage,
    });
  }
  return leads.slice(0, maxAllowed);
}

module.exports = {
  limits,
  getUsage,
  requireTargetingFilters,
  resolveCampaignLimit,
  trimLeadsToQuota,
};
