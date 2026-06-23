const config = require("../config");
const { dataPath } = require("../helpers/paths");
const { httpError } = require("../helpers/errors");
const { pickTone } = require("../helpers/randomTone");
const { renderEmailHtml } = require("../helpers/renderEmailHtml");
const { generateEmailJson } = require("../services/geminiService");
const { loadLeadsFromFile, findLead } = require("../services/leadsService");
const { pickNextLead } = require("../services/leadQueueService");
const { resolveTemplateInput } = require("../services/templatesService");
const { extractApolloLeadsWithEmails } = require("../enrich/apolloCsv");
const { pickNextFromList } = require("../services/csvQueueService");

function wantsHtml(req) {
  const q = String(req?.query?.format || "").toLowerCase();
  if (q === "html") return true;
  const accept = String(req.headers?.accept || "").toLowerCase();
  return accept.includes("text/html");
}

function readInput(req) {
  // Allow both POST body and GET query for quick browser testing.
  return req.method === "GET" ? req.query || {} : req.body || {};
}

async function generateEmail(req, res) {
  const requestStartedAt = Date.now();
  const {
    leadId,
    subject = "",
    templateFile = "template.txt",
    templatesFile = "email-templates.json",
    templateId = "",
    leadsFile = "leads.json",
    stateFile = ".lead-state.json",
  } = readInput(req);

  const leads = await loadLeadsFromFile(dataPath(leadsFile));
  if (!leads) {
    throw httpError(
      400,
      'Invalid leads file format. Expected an array or { "leads": [...] }.'
    );
  }

  let lead;
  let selection = null;
  if (leadId) {
    lead = findLead(leads, leadId);
    if (!lead) throw httpError(404, "Lead not found", { leadId });
  } else {
    const picked = await pickNextLead(leads, { stateFile });
    lead = picked.lead;
    selection = {
      mode: "sequential",
      pickedIndex: picked.pickedIndex,
      nextIndex: picked.nextIndex,
      stateFile: picked.stateFile,
    };
  }

  const { template, templateId: usedTemplateId, templateSource } =
    await resolveTemplateInput({
      templateFile,
      templatesFile,
      templateId,
      lead,
    });

  const tone = pickTone();

  const gen = await generateEmailJson({
    apiKey: config.gemini.apiKey,
    modelName: config.gemini.model,
    lead,
    template,
    tone,
    subjectHint: subject,
  });
  const totalElapsedMs = Date.now() - requestStartedAt;
  const email = gen.email;

  if (wantsHtml(req)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(
      renderEmailHtml({
        subject: email.subject,
        body: email.body,
        meta: {
          tone,
          recipient: {
            name: lead?.name || "",
            email: lead?.email || "",
            profession: lead?.field || lead?.detail || "",
          },
          sendingStub: true,
          timing: { totalElapsedMs, geminiElapsedMs: gen.elapsedMs },
          model: gen.model,
          usage: gen.usage,
          selection,
        },
      })
    );
  }

  return res.json({
    ok: true,
    tone,
    selection,
    lead: {
      id: lead.id ?? null,
      name: lead.name ?? null,
      email: lead.email ?? null,
    },
    template: { source: templateSource, templateId: usedTemplateId },
    insights: {
      sendingStub: true,
      timing: { totalElapsedMs, geminiElapsedMs: gen.elapsedMs },
      model: gen.model,
      usage: gen.usage,
    },
    email,
  });
}

async function generateEmailFromApollo(req, res) {
  const requestStartedAt = Date.now();
  const {
    csvFile = "apollo-contacts-export.csv",
    subject = "",
    templateFile = "template.txt",
    templatesFile = "email-templates.json",
    templateId = "",
    stateFile = ".apollo-lead-state.json",
  } = readInput(req);

  const leads = await extractApolloLeadsWithEmails(dataPath(csvFile));
  if (!leads || leads.length === 0) {
    throw httpError(
      400,
      "No rows with a usable email were found in the Apollo CSV export."
    );
  }
  const picked = await pickNextFromList(leads, { stateFile });
  const lead = picked.item;

  const { template, templateId: usedTemplateId, templateSource } =
    await resolveTemplateInput({
      templateFile,
      templatesFile,
      templateId,
      lead,
    });

  const tone = pickTone();

  const gen = await generateEmailJson({
    apiKey: config.gemini.apiKey,
    modelName: config.gemini.model,
    lead,
    template,
    tone,
    subjectHint: subject,
  });
  const totalElapsedMs = Date.now() - requestStartedAt;
  const email = gen.email;

  if (wantsHtml(req)) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(
      renderEmailHtml({
        subject: email.subject,
        body: email.body,
        meta: {
          tone,
          recipient: {
            name: lead?.name || "",
            email: lead?.email || "",
            profession: lead?.field || lead?.detail || "",
          },
          sendingStub: true,
          timing: { totalElapsedMs, geminiElapsedMs: gen.elapsedMs },
          model: gen.model,
          usage: gen.usage,
          selection: {
            mode: "sequential",
            pickedIndex: picked.pickedIndex,
            nextIndex: picked.nextIndex,
            stateFile: picked.stateFile,
          },
          source: { csvFile },
        },
      })
    );
  }

  return res.json({
    ok: true,
    tone,
    source: { csvFile },
    selection: {
      mode: "sequential",
      pickedIndex: picked.pickedIndex,
      nextIndex: picked.nextIndex,
      stateFile: picked.stateFile,
    },
    lead: { id: lead.id ?? null, name: lead.name ?? null, email: lead.email },
    template: { source: templateSource, templateId: usedTemplateId },
    insights: {
      sendingStub: true,
      timing: { totalElapsedMs, geminiElapsedMs: gen.elapsedMs },
      model: gen.model,
      usage: gen.usage,
    },
    email,
  });
}

module.exports = { generateEmail, generateEmailFromApollo };

