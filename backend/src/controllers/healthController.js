const config = require("../config");
const { store } = require("../store");
const apolloUsage = require("../services/apolloUsageService");
const { probePeopleSearchAccess } = require("../services/apolloProbeService");
const { probeLaunchWebhook } = require("../services/n8nProbeService");

const { probeOrganizationEnrich } = require("../services/apolloEnrichmentService");
const { probeHunterAccess } = require("../services/hunterProbeService");

async function health(_req, res) {
  const [n8nWebhook, apolloApi, apolloEnrichment, hunterApi] = await Promise.all([
    probeLaunchWebhook(),
    probePeopleSearchAccess(),
    probeOrganizationEnrich(),
    probeHunterAccess(),
  ]);
  res.json({
    ok: true,
    service: "pulseflow-ai-backend",
    configured: {
      auth: config.isConfigured("auth"),
      adminAuth: config.isConfigured("adminAuth"),
      supabase: config.isConfigured("supabase"),
      embeddings: config.isConfigured("embeddings"),
      llm: config.isConfigured("llm"),
      llmProvider: config.activeLlmProvider(),
      llmModel: config.activeLlmModel(),
      llmProviders: {
        gemini: {
          configured: config.isLlmProviderConfigured("gemini"),
          model: config.gemini.model,
        },
        groq: {
          configured: config.isLlmProviderConfigured("groq"),
          model: config.groq.modelText,
          modelText: config.groq.modelText,
          modelVision: config.groq.modelVision,
        },
      },
      ocr: config.isConfigured("ocr"),
      ocrModel: config.groq.modelVision,
      apollo: config.isConfigured("apollo"),
      apolloApi,
      apolloEnrichment,
      hunter: config.isConfigured("hunter"),
      hunterApi,
      apolloLimits: apolloUsage.limits(),
      resend: config.isConfigured("resend"),
      mailtrap: config.isConfigured("mailtrap"),
      n8n: config.isConfigured("n8n"),
      n8nWebhook,
      worker: config.isConfigured("worker"),
    },
  });
}

// Private: per-user counts.
async function stats(req, res) {
  const [knowledge, leads] = await Promise.all([
    store.listKnowledge(req.user.id),
    store.listLeads(req.user.id),
  ]);
  const byStatus = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});
  res.json({
    ok: true,
    stats: {
      knowledgeCount: knowledge.length,
      chunkCount: knowledge.reduce((s, k) => s + (k.chunk_count || 0), 0),
      leadCount: leads.length,
      leadsByStatus: byStatus,
    },
  });
}

module.exports = { health, stats };
