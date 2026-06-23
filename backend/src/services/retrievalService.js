const { store } = require("../store");
const { embedText } = require("./embeddingService");

// Returns the top-K most similar knowledge-base chunks for a query string.
// Used by the outreach worker to personalize emails (SRS Module C, Step 1).
async function retrieveContext({ userId, query, topK = 2 }) {
  const text = String(query || "").trim();
  if (!text) return [];
  const embedding = await embedText(text);
  const matches = await store.searchChunks(userId, embedding, topK);
  return matches.filter((m) => m.content && m.content.trim().length > 0);
}

module.exports = { retrieveContext };
