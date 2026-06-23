const { store } = require("../store");
const { httpError } = require("../helpers/errors");
const { ingestContent } = require("../services/ingestService");

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

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const write = (event) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  try {
    const item = await ingestContent({
      userId: req.user.id,
      title,
      sourceUrl: source,
      text,
      onProgress: write,
    });
    write({ type: "complete", item });
    res.end();
  } catch (err) {
    write({
      type: "error",
      message: err.message,
      code: err.code,
      status: err.status || 500,
    });
    res.end();
  }
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

module.exports = { listKnowledge, createKnowledge, createKnowledgeStream, deleteKnowledge };
