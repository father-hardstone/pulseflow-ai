const { GoogleGenerativeAI } = require("@google/generative-ai");
const { httpError } = require("../helpers/errors");

function requireGeminiApiKey(apiKey) {
  if (!apiKey) {
    const err = httpError(
      500,
      "Missing GEMINI_API_KEY. Create a .env file with GEMINI_API_KEY=... (see .env.example)."
    );
    err.code = "GEMINI_KEY_MISSING";
    throw err;
  }
}

function tryParseJsonLoose(raw) {
  // 1) Direct JSON
  try {
    return JSON.parse(raw);
  } catch {
    // continue
  }

  // 2) Strip ```json ... ``` fences
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // continue
    }
  }

  // 3) Best-effort: first {...} block
  const firstObj = raw.match(/\{[\s\S]*\}/);
  if (firstObj?.[0]) {
    try {
      return JSON.parse(firstObj[0]);
    } catch {
      // continue
    }
  }

  return null;
}

async function generateEmailJson({
  apiKey,
  modelName,
  lead,
  template,
  tone,
  subjectHint,
}) {
  requireGeminiApiKey(apiKey);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = [
    "You are an assistant that writes a personalized outreach email.",
    "Return JSON only (no markdown) in the following shape:",
    '{ "subject": string, "body": string }',
    "",
    "Context:",
    "- This is for legal outreach (law students, faculty, lawyers, law firms).",
    "- Use the template library as your primary guidance and keep the content in this legal domain.",
    "",
    "Constraints:",
    "- The email must be ready to send.",
    "- Keep it under ~180 words unless absolutely necessary.",
    "- Do not invent facts about the lead.",
    "- Include one distinct call-to-action (CTA) that is easy to answer (e.g., propose a 10–15 minute chat and give 2–3 time windows).",
    "- The subject/heading must be custom and highly relevant to the lead; avoid generic template-like subjects.",
    "",
    `Tone: ${tone}`,
    subjectHint ? `Subject hint: ${subjectHint}` : "",
    "",
    "Lead data (JSON):",
    JSON.stringify(lead, null, 2),
    "",
    "Template / structure input:",
    template,
    "",
    "Now produce the JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  const t0 = Date.now();
  const result = await model.generateContent(prompt);
  const elapsedMs = Date.now() - t0;

  const response = result?.response;
  const text = response?.text?.() ?? "";
  const usage = response?.usageMetadata || null;

  const parsed = tryParseJsonLoose(text);
  if (!parsed) {
    throw httpError(502, "Gemini did not return valid JSON", { raw: text });
  }

  if (!parsed?.subject || !parsed?.body) {
    throw httpError(502, "Gemini JSON missing subject/body", { json: parsed });
  }

  return { email: parsed, model: modelName, elapsedMs, usage };
}

// Note: the SRS Module C outreach worker lives in `llmService.js` (LangChain +
// Gemini + structured Zod output). This module is retained for the auxiliary
// legacy template-library generator (Module F) only.
module.exports = { generateEmailJson };

