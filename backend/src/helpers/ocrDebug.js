const config = require("../config");

const PREVIEW_MAX_CHARS = 1200;
const FULL_LOG_MAX_CHARS = 4000;

const VISION_DEBUG_METHODS = new Set(["ocr", "vision-analysis", "vision-combined"]);

/**
 * Build a vision debug payload for the ingest NDJSON stream (logged in the browser).
 */
function buildVisionDebugEvent({
  fileName,
  mimeType,
  sourceType,
  extractionMethod,
  useOcr,
  useMetaAnalysis,
  text,
  userId,
  pageCount,
}) {
  if (!VISION_DEBUG_METHODS.has(extractionMethod)) return null;

  const body = String(text || "");
  const lines = body.split("\n");
  const showFull = body.length <= FULL_LOG_MAX_CHARS;
  const preview = showFull
    ? body
    : `${body.slice(0, PREVIEW_MAX_CHARS)}\n… [truncated — ${body.length - PREVIEW_MAX_CHARS} more characters]`;

  const pages =
    pageCount ??
    (body.match(/^--- Page \d+(?: analysis)? ---$/gm)?.length ||
      (sourceType === "image" || sourceType === "image_analysis" ? 1 : null));

  const stage =
    extractionMethod === "vision-analysis" || extractionMethod === "vision-combined"
      ? "post-analysis-pre-chunk"
      : "post-ocr-pre-chunk";

  return {
    type: "ocr_debug",
    meta: {
      at: new Date().toISOString(),
      stage,
      fileName: fileName || null,
      mimeType: mimeType || null,
      sourceType,
      extractionMethod,
      useOcrRequested: useOcr,
      useMetaAnalysis: Boolean(useMetaAnalysis),
      visionModel: config.groq.modelVision,
      characters: body.length,
      lineCount: lines.length,
      pageCount: pages,
      userId: userId || null,
      truncated: !showFull,
    },
    preview,
  };
}

module.exports = { buildVisionDebugEvent, buildOcrDebugEvent: buildVisionDebugEvent };
