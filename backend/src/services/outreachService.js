const { store } = require("../store");
const { httpError } = require("../helpers/errors");
const { requireConfig, requireLlmProvider } = require("../helpers/requireConfig");
const { pickTone } = require("../helpers/randomTone");
const { generateOutreach } = require("./llmService");
const { retrieveContext } = require("./retrievalService");

function leadFullName(lead) {
  return `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "there";
}

function buildRetrievalQuery(lead, objective, enrichment) {
  const parts = [lead.job_title, lead.company_name, lead.industry, objective];
  if (enrichment?.summary?.description) parts.push(enrichment.summary.description);
  if (enrichment?.summary?.keywords?.length) parts.push(enrichment.summary.keywords.join(" "));
  return parts.filter(Boolean).join(" ");
}

// SRS Module C worker: retrieve top-2 context chunks -> LLM (LangChain,
// structured) -> persist on the lead. No fallback: fails fast + marks failed.
async function generateForLead({ userId, leadId, objective = "", enrichment = null, tone }) {
  const user = await store.getUserById(userId);
  if (!user) throw httpError(404, "User not found", { userId });

  const llmProvider = user.llm_provider === "groq" ? "groq" : "gemini";
  requireLlmProvider(llmProvider);

  requireConfig("embeddings");

  const lead = await store.getLead(leadId);
  if (!lead) throw httpError(404, "Lead not found", { leadId });
  if (lead.user_id !== userId) throw httpError(403, "Not your lead", { leadId });

  await store.updateLead(leadId, { status: "processing" });

  try {
    const query = buildRetrievalQuery(lead, objective, enrichment);
    const contextChunks = await retrieveContext({ userId, query, topK: 2 });
    const toneResolved = pickTone(tone);

    const gen = await generateOutreach({
      lead: { ...lead, name: leadFullName(lead) },
      contextChunks,
      objective,
      tone: toneResolved,
      llmProvider,
      enrichment,
    });

    const updated = await store.updateLead(leadId, {
      status: "completed",
      generated_subject: gen.email.subject,
      generated_email: gen.email.body,
    });
    return {
      lead: updated,
      meta: {
        provider: gen.provider,
        model: gen.model,
        elapsedMs: gen.elapsedMs,
        contextCount: contextChunks.length,
      },
      tone: toneResolved,
    };
  } catch (err) {
    await store.updateLead(leadId, { status: "failed" });
    throw err;
  }
}

async function generateForAll({ userId, objective = "", tone }) {
  const leads = await store.listLeads(userId);
  const pending = leads.filter((l) => l.status === "pending" || l.status === "failed");
  const results = [];
  for (const lead of pending) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await generateForLead({ userId, leadId: lead.id, objective, tone });
      results.push({ id: lead.id, ok: true });
    } catch (err) {
      results.push({ id: lead.id, ok: false, error: err.message });
    }
  }
  return { processed: results.length, results };
}

module.exports = { generateForLead, generateForAll };
