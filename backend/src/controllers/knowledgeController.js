const { store } = require("../store");
const { httpError } = require("../helpers/errors");
const { ingestContent } = require("../services/ingestService");
const { retrieveContext } = require("../services/retrievalService");

function parseBooleanField(value) {
  if (value === undefined || value === null || value === "") return null;
  const v = String(value).toLowerCase();
  if (v === "true" || v === "1" || v === "on") return true;
  if (v === "false" || v === "0" || v === "off") return false;
  return null;
}

function streamIngestResponse(res, ingestPromiseFactory) {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const write = (event) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  return ingestPromiseFactory(write)
    .then((item) => {
      write({ type: "complete", item });
      res.end();
    })
    .catch((err) => {
      write({
        type: "error",
        message: err.message,
        code: err.code,
        status: err.status || 500,
      });
      res.end();
    });
}

async function listKnowledge(req, res) {
  const items = await store.listKnowledge(req.user.id);
  res.json({ ok: true, items });
}

async function createKnowledge(req, res) {
  const { title, sourceUrl, url, text } = req.body || {};
  const source = sourceUrl || url || "";
  if (!source && !text) {
    throw httpError(400, "Provide a `sourceUrl` (URL/YouTube) or raw `text`.");
  }
  const item = await ingestContent({
    userId: req.user.id,
    title,
    sourceUrl: source,
    text,
  });
  res.status(201).json({ ok: true, item });
}

async function createKnowledgeStream(req, res) {
  const { title, sourceUrl, url, text } = req.body || {};
  const source = sourceUrl || url || "";
  if (!source && !text) {
    throw httpError(400, "Provide a `sourceUrl` (URL/YouTube) or raw `text`.");
  }

  await streamIngestResponse(res, (write) =>
    ingestContent({
      userId: req.user.id,
      title,
      sourceUrl: source,
      text,
      onProgress: write,
    })
  );
}

async function createKnowledgeStreamUpload(req, res) {
  if (!req.file) {
    throw httpError(400, "Upload a PDF, DOCX, TXT, or image file (PNG, JPG, WEBP).");
  }

  const title = String(req.body?.title || "").trim();
  const useOcr = parseBooleanField(req.body?.useOcr) === true;
  const useMetaAnalysis = parseBooleanField(req.body?.useMetaAnalysis) === true;

  await streamIngestResponse(res, (write) =>
    ingestContent({
      userId: req.user.id,
      title: title || undefined,
      fileBuffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      useOcr,
      useMetaAnalysis,
      onProgress: write,
    })
  );
}

// Semantic (vector) search over the user's ingested chunks.
// Returns the closest chunks by embedding similarity — not exact keyword match.
async function searchKnowledge(req, res) {
  const query = String(req.body?.query || "").trim();
  if (!query) {
    throw httpError(400, "Provide a search `query`.");
  }
  const requested = parseInt(req.body?.topK, 10);
  const topK = Math.min(Math.max(Number.isFinite(requested) ? requested : 5, 1), 20);

  const matches = await retrieveContext({ userId: req.user.id, query, topK });

  const items = await store.listKnowledge(req.user.id);
  const byId = new Map(items.map((it) => [it.id, it]));

  const results = matches.map((m) => {
    const src = m.kb_id ? byId.get(m.kb_id) : null;
    return {
      kbId: m.kb_id || null,
      title: src ? src.title : null,
      sourceType: src ? src.source_type : null,
      sourceUrl: src ? src.source_url : null,
      similarity: typeof m.similarity === "number" ? m.similarity : null,
      content: m.content,
    };
  });

  res.json({ ok: true, query, matches: results });
}

async function deleteKnowledge(req, res) {
  const { id } = req.params;
  const existing = await store.getKnowledge(id);
  if (!existing || existing.user_id !== req.user.id) {
    throw httpError(404, "Knowledge item not found", { id });
  }
  await store.deleteKnowledge(id);
  res.json({ ok: true, id });
}

module.exports = {
  listKnowledge,
  createKnowledge,
  createKnowledgeStream,
  createKnowledgeStreamUpload,
  searchKnowledge,
  deleteKnowledge,
};
