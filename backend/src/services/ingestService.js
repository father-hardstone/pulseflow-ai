const { store } = require("../store");
const config = require("../config");
const { splitText } = require("./textSplitter");
const { embedTexts } = require("./embeddingService");
const { fetchYouTubeTranscript } = require("./youtubeTranscriptService");
const { httpError } = require("../helpers/errors");
const { requireConfig } = require("../helpers/requireConfig");
const { extractDocumentText } = require("./documentExtractService");

const INGEST_STEPS = ["rasterize", "ocr", "analyze", "fetch", "chunk", "embed", "store", "finalize"];

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isYouTube(url) {
  return /(?:youtube\.com|youtu\.be)/i.test(url || "");
}

async function fetchUrlText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "PulseFlowAI/1.0 (+content-ingest)" },
    redirect: "follow",
  });
  if (!res.ok) throw httpError(400, `Failed to fetch URL (${res.status})`);
  const contentType = res.headers.get("content-type") || "";
  const raw = await res.text();
  if (contentType.includes("text/html")) return stripHtml(raw);
  return raw;
}

function guessTitleFromUrl(url) {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || u.hostname) || u.hostname;
  } catch {
    return url;
  }
}

function emitProgress(onProgress, step, status, detail) {
  if (onProgress) onProgress({ type: "step", step, status, detail });
}

// Ingests a content asset into the knowledge base with optional progress events.
async function ingestContent({
  userId,
  title,
  sourceUrl,
  text,
  fileBuffer,
  fileName,
  mimeType,
  useOcr,
  useMetaAnalysis,
  onProgress,
}) {
  requireConfig("embeddings");

  let sourceType = "text";
  let resolvedText = text || "";
  let resolvedTitle = title || "";
  let resolvedSourceUrl = sourceUrl || null;
  let kbId = null;
  let currentStep = "fetch";

  try {
    if (fileBuffer) {
      const docProgress = onProgress
        ? (step, status, detail) => emitProgress(onProgress, step, status, detail)
        : null;

      const extracted = await extractDocumentText(fileBuffer, {
        fileName,
        mimeType,
        useOcr,
        useMetaAnalysis,
        userId,
        onProgress: docProgress,
        onOcrDebug: onProgress ? (event) => onProgress(event) : null,
      });
      sourceType = extracted.sourceType;
      resolvedText = extracted.text;
      if (!resolvedTitle && extracted.title) resolvedTitle = extracted.title;
      currentStep = "fetch";
    } else {
      currentStep = "fetch";
      emitProgress(onProgress, "fetch", "running");

      if (sourceUrl && !resolvedText) {
        if (isYouTube(sourceUrl)) {
          sourceType = "youtube";
          const yt = await fetchYouTubeTranscript(sourceUrl);
          resolvedText = yt.text;
          if (!resolvedTitle && yt.title) resolvedTitle = yt.title;
        } else {
          sourceType = "url";
          resolvedText = await fetchUrlText(sourceUrl);
        }
        if (!resolvedTitle) resolvedTitle = guessTitleFromUrl(sourceUrl);
      }

      resolvedText = String(resolvedText || "").trim();
      if (!resolvedText) {
        throw httpError(
          400,
          "Nothing to ingest: provide a file, `text`, or a fetchable `sourceUrl`."
        );
      }
      if (!resolvedTitle) resolvedTitle = resolvedText.slice(0, 60);
      emitProgress(onProgress, "fetch", "done", {
        characters: resolvedText.length,
        sourceType,
      });
    }

    resolvedText = String(resolvedText || "").trim();
    if (!resolvedText) {
      throw httpError(
        400,
        "Nothing to ingest: provide a file, `text`, or a fetchable `sourceUrl`."
      );
    }
    if (!resolvedTitle) resolvedTitle = resolvedText.slice(0, 60);

    const kb = await store.createKnowledge({
      userId,
      title: resolvedTitle,
      sourceUrl: resolvedSourceUrl,
      sourceType,
      status: "processing",
    });
    kbId = kb.id;

    currentStep = "chunk";
    emitProgress(onProgress, "chunk", "running");
    const chunks = await splitText(resolvedText, { chunkSize: 1000, chunkOverlap: 150 });
    if (chunks.length === 0) throw httpError(400, "No extractable text content.");
    emitProgress(onProgress, "chunk", "done", { count: chunks.length });

    currentStep = "embed";
    emitProgress(onProgress, "embed", "running");
    const embeddings = await embedTexts(chunks);
    emitProgress(onProgress, "embed", "done", {
      count: embeddings.length,
      dimensions: config.embeddingDimensions,
    });

    currentStep = "store";
    emitProgress(onProgress, "store", "running");
    const rows = chunks.map((content, i) => ({ content, embedding: embeddings[i] }));
    await store.insertChunks(kb.id, rows);
    emitProgress(onProgress, "store", "done", { count: rows.length });

    currentStep = "finalize";
    emitProgress(onProgress, "finalize", "running");
    const updated = await store.updateKnowledge(kb.id, { status: "ready" });
    emitProgress(onProgress, "finalize", "done");
    return { ...updated, chunk_count: chunks.length };
  } catch (err) {
    emitProgress(onProgress, currentStep, "failed", { error: err.message });
    if (kbId) {
      try {
        await store.updateKnowledge(kbId, { status: "failed" });
      } catch {
        /* ignore cleanup errors */
      }
    }
    throw err;
  }
}

module.exports = { ingestContent, INGEST_STEPS };
