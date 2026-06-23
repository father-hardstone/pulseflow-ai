const path = require("node:path");
const dotenv = require("dotenv");

// Always load backend/.env regardless of process cwd.
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function parseOrigins(value) {
  if (!value) return null; // null => reflect request origin
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const config = {
  port: Number(process.env.PORT || 3000),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "",
    accessTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL || "7d",
  },

  adminJwt: {
    accessSecret: process.env.JWT_ADMIN_ACCESS_SECRET || "",
    refreshSecret: process.env.JWT_ADMIN_REFRESH_SECRET || "",
    accessTtl: process.env.JWT_ADMIN_ACCESS_TTL || "15m",
    refreshTtl: process.env.JWT_ADMIN_REFRESH_TTL || "7d",
  },

  admin: {
    bootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL || "",
    bootstrapPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD || "",
  },

  worker: {
    // Shared secret n8n must send (x-worker-secret) to call worker endpoints.
    secret: process.env.WORKER_SHARED_SECRET || "",
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  },

  llm: {
    // Active provider for outreach generation: "gemini" | "groq"
    provider: (process.env.LLM_PROVIDER || "gemini").toLowerCase(),
  },

  supabase: {
    url: process.env.SUPABASE_URL || "",
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  },

  huggingface: {
    apiKey: process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || "",
    model: process.env.HUGGINGFACE_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2",
  },

  apollo: {
    apiKey: process.env.APOLLO_API_KEY || "",
    // Free-tier guardrails — one Apollo search ≈ one credit batch (per_page).
    maxLeadsPerCampaign: Number(process.env.APOLLO_MAX_LEADS_PER_CAMPAIGN || 10),
    defaultLeadsPerCampaign: Number(process.env.APOLLO_DEFAULT_LEADS_PER_CAMPAIGN || 1),
    maxLeadsPerMonth: Number(process.env.APOLLO_MAX_LEADS_PER_MONTH || 50),
    maxLeadsPerUserMonth: Number(process.env.APOLLO_MAX_LEADS_PER_USER_MONTH || 25),
  },

  hunter: {
    apiKey: process.env.HUNTER_API_KEY || "",
  },

  n8n: {
    launchWebhookUrl: process.env.N8N_LAUNCH_WEBHOOK_URL || "",
  },

  youtube: {
    transcriptLangs: (process.env.YOUTUBE_TRANSCRIPT_LANGS || "en,en-US")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || "",
    fromEmail: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    fromName: process.env.RESEND_FROM_NAME || "PulseFlow AI",
  },

  mailtrap: {
    apiToken: process.env.MAILTRAP_API_TOKEN || "",
    fromEmail: process.env.MAILTRAP_FROM_EMAIL || "pulseflow@demo.mailtrap.io",
    fromName: process.env.MAILTRAP_FROM_NAME || "PulseFlow AI",
  },

  embeddingDimensions: 384,
};

// Reports which required env vars are missing for a given capability. Used by
// services to fail fast with a clear, actionable error (no silent fallbacks).
const REQUIREMENTS = {
  auth: () => [
    ["JWT_ACCESS_SECRET", config.jwt.accessSecret],
    ["JWT_REFRESH_SECRET", config.jwt.refreshSecret],
    ["SUPABASE_URL", config.supabase.url],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabase.key],
  ],
  adminAuth: () => [
    ["JWT_ADMIN_ACCESS_SECRET", config.adminJwt.accessSecret],
    ["JWT_ADMIN_REFRESH_SECRET", config.adminJwt.refreshSecret],
    ["SUPABASE_URL", config.supabase.url],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabase.key],
  ],
  supabase: () => [
    ["SUPABASE_URL", config.supabase.url],
    ["SUPABASE_SERVICE_ROLE_KEY", config.supabase.key],
  ],
  embeddings: () => [["HUGGINGFACE_API_KEY", config.huggingface.apiKey]],
  llm: () => {
    if (config.llm.provider === "groq") {
      return [["GROQ_API_KEY", config.groq.apiKey]];
    }
    return [["GEMINI_API_KEY", config.gemini.apiKey]];
  },
  apollo: () => [["APOLLO_API_KEY", config.apollo.apiKey]],
  hunter: () => [["HUNTER_API_KEY", config.hunter.apiKey]],
  resend: () => [["RESEND_API_KEY", config.resend.apiKey]],
  mailtrap: () => [["MAILTRAP_API_TOKEN", config.mailtrap.apiToken]],
  n8n: () => [["N8N_LAUNCH_WEBHOOK_URL", config.n8n.launchWebhookUrl]],
  worker: () => [["WORKER_SHARED_SECRET", config.worker.secret]],
};

function missingForLlm(provider) {
  const p = provider === "groq" ? "groq" : "gemini";
  if (p === "groq") {
    return config.groq.apiKey ? [] : ["GROQ_API_KEY"];
  }
  return config.gemini.apiKey ? [] : ["GEMINI_API_KEY"];
}

function isLlmProviderConfigured(provider) {
  return missingForLlm(provider).length === 0;
}

function missingFor(capability) {
  const checks = REQUIREMENTS[capability] ? REQUIREMENTS[capability]() : [];
  return checks.filter(([, v]) => !v).map(([name]) => name);
}

function isConfigured(capability) {
  return missingFor(capability).length === 0;
}

function activeLlmProvider() {
  return config.llm.provider === "groq" ? "groq" : "gemini";
}

function activeLlmModel() {
  return activeLlmProvider() === "groq" ? config.groq.model : config.gemini.model;
}

config.missingFor = missingFor;
config.missingForLlm = missingForLlm;
config.isConfigured = isConfigured;
config.isLlmProviderConfigured = isLlmProviderConfigured;
config.activeLlmProvider = activeLlmProvider;
config.activeLlmModel = activeLlmModel;

module.exports = config;
