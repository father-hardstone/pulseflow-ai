const config = require("../config");
const { requireLlmProvider } = require("../helpers/requireConfig");
const { httpError } = require("../helpers/errors");
const { resolveTone } = require("../helpers/emailTones");
const { composeStructuredEmail } = require("../helpers/renderOutreachEmail");

const modelCache = new Map();
let zodPromise = null;

function resolveProvider(provider) {
  return provider === "groq" ? "groq" : "gemini";
}

async function getModel(provider) {
  const p = resolveProvider(provider);
  if (!modelCache.has(p)) {
    if (p === "groq") {
      modelCache.set(
        p,
        import("@langchain/groq").then(
          (mod) =>
            new mod.ChatGroq({
              apiKey: config.groq.apiKey,
              model: config.groq.model,
              temperature: 0.55,
            })
        )
      );
    } else {
      modelCache.set(
        p,
        import("@langchain/google-genai").then(
          (mod) =>
            new mod.ChatGoogleGenerativeAI({
              apiKey: config.gemini.apiKey,
              model: config.gemini.model,
              temperature: 0.55,
            })
        )
      );
    }
  }
  return modelCache.get(p);
}

function modelNameFor(provider) {
  return resolveProvider(provider) === "groq" ? config.groq.model : config.gemini.model;
}

async function getZod() {
  if (!zodPromise) zodPromise = import("zod").then((mod) => mod.z);
  return zodPromise;
}

function isGenericName(name) {
  const n = String(name || "").trim().toLowerCase();
  return !n || n === "team" || n === "there" || n === "unknown";
}

function buildPrompt({ lead, contextChunks, objective, tone, enrichment }) {
  const contextBlock = contextChunks.length
    ? contextChunks
        .map(
          (c, i) =>
            `--- CONTEXT ${i + 1} (relevance ${Number(c.similarity || 0).toFixed(3)}) ---\n${c.content}`
        )
        .join("\n\n")
    : "(no knowledge-base context available)";

  const enrichmentBlock = enrichment?.block
    ? enrichment.block
    : "(no inbound enrichment data)";

  const isInbound = Boolean(enrichment?.block);
  const genericName = isGenericName(lead.first_name || lead.name);

  return [
    isInbound
      ? "You are an expert B2B SDR writing a personalized reply to an inbound lead or account."
      : "You are an expert B2B SDR who writes hyper-personalized outreach emails.",
    "",
    "Output a complete, ready-to-send email in distinct sections (greeting, opening, body, cta, signOff).",
    "Write like a top-performing rep: specific, credible, no filler, no markdown.",
    "",
    "Structure rules:",
    "- greeting: one line. Use the lead's first name when available.",
    genericName && lead.company_name
      ? `- The contact name is generic — greet the team at ${lead.company_name} (e.g. "Hi Linear team,").`
      : "- Personalize the greeting with the lead's first name.",
    "- opening: one sentence that references something specific about their company, role, or inbound context.",
    "- body: 2–3 short sentences connecting their situation to your value (grounded in CONTEXT).",
    "- cta: one sentence with a clear ask and two concrete time options (day + time).",
    "- signOff: one line closing + placeholder sender name on its own line: [Your Name]",
  isInbound
      ? "- Acknowledge inbound interest; never open with 'I hope this email finds you well'."
      : "- Infer likely pain points from role/company; do not invent facts.",
    "",
    "Constraints:",
    "- Total under ~150 words across all sections.",
    "- Subject: specific, curiosity-driving, no spammy ALL CAPS.",
    "- Do not include metadata lines (Company:, Title:, Intended recipient).",
    "",
    `Tone: ${resolveTone(tone)}`,
    objective ? `Campaign objective: ${objective}` : "",
    "",
    "Lead data (JSON):",
    JSON.stringify(lead, null, 2),
    "",
    "INBOUND ENRICHMENT:",
    enrichmentBlock,
    "",
    "CONTEXT:",
    contextBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateOutreach({
  lead,
  contextChunks = [],
  objective = "",
  tone,
  llmProvider,
  enrichment = null,
}) {
  const provider = resolveProvider(llmProvider || config.activeLlmProvider());
  requireLlmProvider(provider);
  const z = await getZod();
  const model = await getModel(provider);

  const schema = z.object({
    subject: z.string().describe("Specific, relevant email subject line"),
    greeting: z.string().describe("One-line personalized greeting"),
    opening: z.string().describe("One sentence hook tied to the lead or company"),
    body: z.string().describe("2-3 sentences of value proposition grounded in context"),
    cta: z.string().describe("Clear CTA with two specific meeting time options"),
    signOff: z.string().describe("Professional sign-off ending with [Your Name] on its own line"),
  });

  const structured = model.withStructuredOutput(schema, { name: "outreach_email" });
  const prompt = buildPrompt({ lead, contextChunks, objective, tone, enrichment });

  const t0 = Date.now();
  let result;
  try {
    result = await structured.invoke(prompt);
  } catch (err) {
    throw httpError(502, `LLM generation failed: ${err.message}`);
  }
  const elapsedMs = Date.now() - t0;

  if (!result?.subject || !result?.greeting || !result?.body) {
    throw httpError(502, "LLM returned incomplete structured output");
  }

  const body = composeStructuredEmail(result);
  return {
    email: { subject: result.subject.trim(), body },
    sections: result,
    provider,
    model: modelNameFor(provider),
    elapsedMs,
  };
}

module.exports = { generateOutreach, resolveProvider };
