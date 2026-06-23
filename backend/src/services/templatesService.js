const fs = require("node:fs/promises");
const { dataPath } = require("../helpers/paths");
const { httpError } = require("../helpers/errors");

async function loadEmailTemplates(fileName = "email-templates.json") {
  const raw = await fs.readFile(dataPath(fileName), "utf8");
  const json = JSON.parse(raw);
  const templates = Array.isArray(json) ? json : json?.templates;
  if (!Array.isArray(templates)) {
    const err = httpError(
      400,
      'Invalid email templates format. Expected an array or { "templates": [...] }.'
    );
    err.code = "TEMPLATES_INVALID";
    throw err;
  }
  return templates;
}

function findTemplate(templates, templateId) {
  if (!templateId) return null;
  const needle = String(templateId).trim().toLowerCase();
  return (
    templates.find((t) => String(t.id || "").trim().toLowerCase() === needle) ||
    null
  );
}

function renderTemplateString(template, vars) {
  return String(template || "").replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_, key) => {
      const v = vars?.[key];
      return v === undefined || v === null ? "" : String(v);
    }
  );
}

async function resolveTemplateInput({
  templateFile = "template.txt",
  templatesFile = "email-templates.json",
  templateId = "",
  lead,
}) {
  // If a templateId is provided, it is a *preference* (Gemini may still mix/match).
  // If no templateId is provided, we still provide the full library for mixing/matching,
  // and also optionally include the free-form template.txt as extra guidance.
  const templates = await loadEmailTemplates(templatesFile);
  const preferred = templateId ? findTemplate(templates, templateId) : null;
  if (templateId && !preferred) {
    const err = httpError(400, `Template not found: ${templateId}`);
    err.code = "TEMPLATE_NOT_FOUND";
    throw err;
  }

  const vars = {
    name: lead?.name || "",
    field: lead?.field || lead?.detail || "",
  };

  const renderedLibrary = templates.map((t) => {
    const renderedSubject = renderTemplateString(t.subject || "", vars);
    const renderedBody = renderTemplateString(t.body || "", vars);
    return [
      `--- TEMPLATE ${t.id} ---`,
      `goal: ${t.goal || ""}`,
      `tone_tag: ${t.tone || ""}`,
      "subject_example:",
      renderedSubject,
      "body_example:",
      renderedBody,
      "",
    ].join("\n");
  });

  let extraFileTemplate = "";
  try {
    extraFileTemplate = await fs.readFile(dataPath(templateFile), "utf8");
  } catch {
    // Optional; ignore if missing.
  }

  const template = [
    "TEMPLATE_LIBRARY:",
    "",
    ...renderedLibrary,
    preferred
      ? `PREFERRED_TEMPLATE_ID: ${preferred.id} (you may mix/match across templates)`
      : "PREFERRED_TEMPLATE_ID: (none) (you may mix/match across templates)",
    "",
    extraFileTemplate
      ? ["ADDITIONAL_FREEFORM_TEMPLATE_TXT:", extraFileTemplate].join("\n")
      : "",
    "",
    "Guidance:",
    "- You may mix and match subject/body patterns across the templates.",
    "- All placeholders must be fully resolved (no {{...}} left).",
    "- The final subject must be custom and highly relevant to the specific lead; do not reuse a template subject verbatim if it feels generic.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    template,
    templateId: preferred?.id ?? null,
    templateSource: "email-templates.json",
  };
}

module.exports = { resolveTemplateInput };

