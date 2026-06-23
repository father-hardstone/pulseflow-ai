const { store } = require("../store");
const { httpError } = require("../helpers/errors");
const { launchCampaign } = require("../services/campaignService");
const { generateForLead, generateForAll } = require("../services/outreachService");
const apolloUsage = require("../services/apolloUsageService");
const demoEmail = require("../services/demoEmailService");

async function listLeads(req, res) {
  const leads = await store.listLeads(req.user.id);
  res.json({ ok: true, leads });
}

async function createCampaign(req, res) {
  const { jobTitle, industry, location, keyword, limit, objective, domain, inboundEmail, tone, prospectProvider } =
    req.body || {};
  const result = await launchCampaign({
    userId: req.user.id,
    filters: { jobTitle, industry, location, keyword, limit },
    objective: objective || "",
    domain,
    inboundEmail,
    tone,
    prospectProvider: prospectProvider === "hunter" ? "hunter" : "apollo",
  });
  const status =
    result.mode === "inbound_enrichment" || result.mode === "hunter_prospecting" ? 201 : 202;
  res.status(status).json({ ok: true, objective: objective || "", ...result });
}

async function apolloQuota(req, res) {
  const usage = await apolloUsage.getUsage(req.user.id);
  res.json({ ok: true, apollo: usage });
}

async function sendLeadEmail(req, res) {
  const lead = await store.getLead(req.params.id);
  if (!lead || lead.user_id !== req.user.id) {
    throw httpError(404, "Lead not found", { id: req.params.id });
  }
  const delivery = await demoEmail.sendOutreachEmail({ userId: req.user.id, lead });
  res.json({ ok: true, delivery });
}

async function generateLeadEmail(req, res) {
  const { id } = req.params;
  const { objective, tone } = req.body || {};
  const result = await generateForLead({ userId: req.user.id, leadId: id, objective, tone });
  res.json({ ok: true, ...result });
}

async function generateAllEmails(req, res) {
  const { objective, tone } = req.body || {};
  const result = await generateForAll({ userId: req.user.id, objective, tone });
  res.json({ ok: true, ...result });
}

async function clearLeads(req, res) {
  await store.clearLeads(req.user.id);
  res.json({ ok: true });
}

async function getLead(req, res) {
  const lead = await store.getLead(req.params.id);
  if (!lead || lead.user_id !== req.user.id) {
    throw httpError(404, "Lead not found", { id: req.params.id });
  }
  res.json({ ok: true, lead });
}

module.exports = {
  listLeads,
  createCampaign,
  generateLeadEmail,
  sendLeadEmail,
  generateAllEmails,
  clearLeads,
  getLead,
  apolloQuota,
};
