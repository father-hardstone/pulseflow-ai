const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const config = require("../config");
const { httpError } = require("../helpers/errors");
const { requireConfig } = require("../helpers/requireConfig");
const { ocrImageBuffer, ocrImagePages } = require("./ocrService");
const { rasterizePdfToImages } = require("./pdfRasterService");
const { analyzeImageBuffer, analyzeImagePages } = require("./imageAnalysisService");
const { buildVisionDebugEvent } = require("../helpers/ocrDebug");

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);
const MIME_TO_TYPE = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "image/png": "image",
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/webp": "image",
};

function extensionOf(name) {
  const match = String(name || "").toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match ? match[1] : "";
}

function stripExtension(name) {
  return String(name || "").replace(/\.[^.]+$/, "") || name;
}

function detectSourceType(fileName, mimeType) {
  const ext = extensionOf(fileName);
  if (ext === ".pdf" || mimeType === "application/pdf") return "pdf";
  if (
    ext === ".docx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (ext === ".txt" || mimeType === "text/plain") return "txt";
  if (
    [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ||
    String(mimeType || "").startsWith("image/")
  ) {
    return "image";
  }
  return null;
}

function isImageSourceType(sourceType) {
  return sourceType === "image";
}

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function emitStep(onProgress, step, status, detail) {
  if (onProgress) onProgress(step, status, detail);
}

function skipVisionSteps(onProgress, reason) {
  emitStep(onProgress, "rasterize", "done", { skipped: true, reason });
  emitStep(onProgress, "analyze", "done", { skipped: true, reason });
  emitStep(onProgress, "ocr", "done", { skipped: true, reason });
}

function combineVisionSections(sections) {
  return sections
    .filter((s) => s.text)
    .map((s) => `=== ${s.heading} ===\n${s.text}`)
    .join("\n\n")
    .trim();
}

function resolveExtractionMeta({ usedOcr, usedVision, baseSourceType }) {
  if (usedOcr && usedVision) {
    return {
      extractionMethod: "vision-combined",
      sourceType:
        baseSourceType === "pdf"
          ? "pdf_analysis"
          : baseSourceType === "image"
            ? "image_analysis"
            : baseSourceType,
    };
  }
  if (usedVision) {
    return {
      extractionMethod: "vision-analysis",
      sourceType:
        baseSourceType === "pdf"
          ? "pdf_analysis"
          : baseSourceType === "image"
            ? "image_analysis"
            : baseSourceType,
    };
  }
  if (usedOcr) {
    return { extractionMethod: "ocr", sourceType: baseSourceType };
  }
  return { extractionMethod: "text-layer", sourceType: baseSourceType };
}

async function extractPdfText(buffer) {
  const result = await pdfParse(buffer);
  return normalizeWhitespace(result.text);
}

async function extractDocxText(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  if (result.messages?.length) {
    const warnings = result.messages
      .filter((m) => m.type === "warning")
      .map((m) => m.message)
      .join("; ");
    if (warnings) {
      console.warn("[documentExtract] DOCX warnings:", warnings);
    }
  }
  return normalizeWhitespace(result.value);
}

function extractTxtText(buffer) {
  return normalizeWhitespace(buffer.toString("utf8"));
}

function hasUsableText(text) {
  return normalizeWhitespace(text).length >= config.ocr.minTextChars;
}

async function rasterizePdf(buffer, onProgress) {
  emitStep(onProgress, "rasterize", "running");
  const pages = await rasterizePdfToImages(buffer, {
    onPage: ({ page }) => {
      emitStep(onProgress, "rasterize", "running", { page });
    },
  });
  emitStep(onProgress, "rasterize", "done", {
    pages: pages.length,
    scale: config.ocr.pdfScale,
  });
  return pages;
}

async function runMetaAnalysisOnPages(pages, onProgress) {
  emitStep(onProgress, "analyze", "running", { page: 0, total: pages.length });
  const text = normalizeWhitespace(
    await analyzeImagePages(pages, {
      onPage: ({ page, total, status, characters }) => {
        if (status === "running") {
          emitStep(onProgress, "analyze", "running", { page, total });
        } else if (status === "done") {
          emitStep(onProgress, "analyze", "running", { page, total, characters });
        }
      },
    })
  );
  emitStep(onProgress, "analyze", "done", {
    pages: pages.length,
    characters: text.length,
    model: config.groq.modelVision,
  });
  return text;
}

async function runOcrOnPages(pages, onProgress) {
  emitStep(onProgress, "ocr", "running", { page: 0, total: pages.length });
  const text = normalizeWhitespace(
    await ocrImagePages(pages, {
      onPage: ({ page, total, status, characters }) => {
        if (status === "running") {
          emitStep(onProgress, "ocr", "running", { page, total });
        } else if (status === "done") {
          emitStep(onProgress, "ocr", "running", { page, total, characters });
        }
      },
    })
  );
  emitStep(onProgress, "ocr", "done", {
    pages: pages.length,
    characters: text.length,
    model: config.groq.modelVision,
  });
  return text;
}

async function processImageVision(buffer, { fileName, mimeType, useMetaAnalysis, useOcr, onProgress }) {
  if (!useMetaAnalysis && !useOcr) {
    throw httpError(
      400,
      "Enable meta analysis and/or OCR for images, or paste the content as text instead."
    );
  }

  requireConfig("ocr");
  emitStep(onProgress, "rasterize", "done", { skipped: true, reason: "Image upload" });

  const sections = [];
  let usedOcr = false;
  let usedVision = false;

  if (useMetaAnalysis) {
    emitStep(onProgress, "analyze", "running");
    const analysis = normalizeWhitespace(
      await analyzeImageBuffer(buffer, { fileName, mimeType })
    );
    emitStep(onProgress, "analyze", "done", {
      characters: analysis.length,
      model: config.groq.modelVision,
    });
    sections.push({ heading: "META ANALYSIS", text: analysis });
    usedVision = true;
  } else {
    emitStep(onProgress, "analyze", "done", { skipped: true, reason: "Not enabled" });
  }

  if (useOcr) {
    emitStep(onProgress, "ocr", "running", { page: 1, total: 1 });
    const ocrText = normalizeWhitespace(
      await ocrImageBuffer(buffer, { fileName, mimeType })
    );
    emitStep(onProgress, "ocr", "done", {
      page: 1,
      total: 1,
      characters: ocrText.length,
      model: config.groq.modelVision,
    });
    sections.push({ heading: "OCR TEXT", text: ocrText });
    usedOcr = true;
  } else {
    emitStep(onProgress, "ocr", "done", { skipped: true, reason: "Not enabled" });
  }

  const text = combineVisionSections(sections);
  const meta = resolveExtractionMeta({ usedOcr, usedVision, baseSourceType: "image" });

  return {
    text,
    usedOcr,
    usedVision,
    pageCount: 1,
    ...meta,
  };
}

async function processPdfVision(buffer, { useMetaAnalysis, useOcr, onProgress }) {
  if (!useMetaAnalysis && !useOcr) {
    skipVisionSteps(onProgress, "Vision options not enabled");
    emitStep(onProgress, "fetch", "running");

    const text = await extractPdfText(buffer);
    if (!hasUsableText(text)) {
      throw httpError(
        400,
        "No embedded text found in this PDF. Enable meta analysis or OCR for scanned documents."
      );
    }

    return {
      text,
      usedOcr: false,
      usedVision: false,
      pageCount: null,
      extractionMethod: "text-layer",
      sourceType: "pdf",
    };
  }

  requireConfig("ocr");
  const pages = await rasterizePdf(buffer, onProgress);
  const sections = [];
  let usedOcr = false;
  let usedVision = false;

  if (useMetaAnalysis) {
    const analysis = await runMetaAnalysisOnPages(pages, onProgress);
    sections.push({ heading: "META ANALYSIS", text: analysis });
    usedVision = true;
  } else {
    emitStep(onProgress, "analyze", "done", { skipped: true, reason: "Not enabled" });
  }

  if (useOcr) {
    const ocrText = await runOcrOnPages(pages, onProgress);
    sections.push({ heading: "OCR TEXT", text: ocrText });
    usedOcr = true;
  } else {
    emitStep(onProgress, "ocr", "done", { skipped: true, reason: "Not enabled" });
  }

  const text = combineVisionSections(sections);
  const meta = resolveExtractionMeta({ usedOcr, usedVision, baseSourceType: "pdf" });

  return {
    text,
    usedOcr,
    usedVision,
    pageCount: pages.length,
    ...meta,
  };
}

async function extractDocumentText(
  buffer,
  {
    fileName = "",
    mimeType = "",
    onProgress,
    onOcrDebug,
    useOcr = false,
    useMetaAnalysis = false,
    userId = null,
  } = {}
) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw httpError(400, "Uploaded file is empty.");
  }

  const sourceType = detectSourceType(fileName, mimeType);
  if (!sourceType) {
    throw httpError(
      400,
      "Unsupported file type. Upload PDF, DOCX, TXT, or an image (PNG, JPG, WEBP)."
    );
  }

  const ext = extensionOf(fileName);
  if (ext && !SUPPORTED_EXTENSIONS.has(ext)) {
    throw httpError(
      400,
      "Unsupported file type. Upload PDF, DOCX, TXT, or an image (PNG, JPG, WEBP)."
    );
  }

  let result;

  if (isImageSourceType(sourceType)) {
    result = await processImageVision(buffer, {
      fileName,
      mimeType,
      useMetaAnalysis,
      useOcr,
      onProgress,
    });
  } else if (sourceType === "pdf") {
    result = await processPdfVision(buffer, { useMetaAnalysis, useOcr, onProgress });
  } else {
    skipVisionSteps(onProgress, "Not applicable");
    emitStep(onProgress, "fetch", "running");

    const text =
      sourceType === "docx" ? await extractDocxText(buffer) : extractTxtText(buffer);

    result = {
      text,
      usedOcr: false,
      usedVision: false,
      pageCount: null,
      extractionMethod: "text",
      sourceType,
    };
  }

  let text = normalizeWhitespace(result.text);
  if (!text) {
    throw httpError(
      400,
      `No extractable text found in ${fileName || "the uploaded file"}. Try enabling meta analysis or OCR, or paste the content as text.`
    );
  }

  const { usedOcr, usedVision, pageCount, extractionMethod, sourceType: resolvedSourceType } =
    result;

  if ((usedOcr || usedVision) && onOcrDebug) {
    const debugEvent = buildVisionDebugEvent({
      fileName,
      mimeType,
      sourceType: resolvedSourceType,
      extractionMethod,
      useOcr,
      useMetaAnalysis,
      text,
      userId,
      pageCount,
    });
    if (debugEvent) onOcrDebug(debugEvent);
  }

  if (sourceType !== "docx" && sourceType !== "txt") {
    emitStep(onProgress, "fetch", "running");
  }

  emitStep(onProgress, "fetch", "done", {
    characters: text.length,
    sourceType: resolvedSourceType,
    method: extractionMethod,
    ocr: usedOcr,
    visionAnalysis: usedVision,
  });

  return {
    text,
    sourceType: resolvedSourceType,
    fileName: fileName || null,
    title: stripExtension(fileName) || null,
    ocr: usedOcr,
    visionAnalysis: usedVision,
    extractionMethod,
  };
}

module.exports = {
  extractDocumentText,
  detectSourceType,
  stripExtension,
  isImageSourceType,
};
