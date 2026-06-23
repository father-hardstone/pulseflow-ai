const config = require("../config");
const { httpError } = require("./errors");

const LABELS = {
  auth: "Authentication",
  adminAuth: "Admin authentication",
  supabase: "Supabase database",
  embeddings: "HuggingFace embeddings",
  llm: "LLM",
  apollo: "Apollo lead source",
  hunter: "Hunter.io lead source",
  resend: "Resend email delivery",
  mailtrap: "Mailtrap email sandbox",
  n8n: "n8n automation",
  worker: "Worker endpoint",
};

function llmLabel(provider) {
  const p = provider || config.activeLlmProvider();
  return p === "groq" ? "Groq (LLM)" : "Gemini (LLM)";
}

// Fail fast (no fallbacks): throws a clear 503 if a capability is not configured.
function requireConfig(capability, options = {}) {
  let missing;
  if (capability === "llm" && options.provider) {
    missing = config.missingForLlm(options.provider);
  } else {
    missing = config.missingFor(capability);
  }
  if (missing.length > 0) {
    const err = httpError(
      503,
      `${capability === "llm" ? llmLabel(options.provider) : LABELS[capability] || capability} is not configured. Missing env var(s): ${missing.join(", ")}.`,
      { capability, missing }
    );
    err.code = "NOT_CONFIGURED";
    throw err;
  }
}

function requireLlmProvider(provider) {
  requireConfig("llm", { provider });
}

module.exports = { requireConfig, requireLlmProvider };
