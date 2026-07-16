const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createCanvas } = require("@napi-rs/canvas");

const config = require("../config");
const { httpError } = require("../helpers/errors");
const { ensurePdfCanvasGlobals } = require("../helpers/pdfCanvasPolyfill");
const { MAX_OCR_IMAGE_BYTES } = require("./ocrService");

let pdfjsPromise;

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjsRoot = await ensurePdfCanvasGlobals();
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

      const workerPath = path.join(pdfjsRoot, "legacy/build/pdf.worker.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

      return { pdfjs, pdfjsRoot };
    })();
  }
  return pdfjsPromise;
}

async function rasterizePdfToImages(buffer, { maxPages, scale, onPage } = {}) {
  const { pdfjs, pdfjsRoot } = await loadPdfJs();
  const limit = maxPages ?? config.ocr.maxPdfPages;
  const renderScale = scale ?? config.ocr.pdfScale;
  const pages = [];

  let pdfDocument;
  try {
    pdfDocument = await pdfjs
      .getDocument({
        data: new Uint8Array(buffer),
        standardFontDataUrl: path.join(pdfjsRoot, "standard_fonts/"),
        cMapUrl: path.join(pdfjsRoot, "cmaps/"),
        cMapPacked: true,
        isEvalSupported: false,
        useSystemFonts: true,
      })
      .promise;
  } catch (err) {
    throw httpError(400, `Failed to read PDF for OCR: ${err.message}`);
  }

  const totalPages = pdfDocument.numPages;
  if (totalPages === 0) {
    throw httpError(400, "PDF contains no pages to OCR.");
  }

  const pageCount = Math.min(totalPages, limit);
  if (totalPages > limit) {
    throw httpError(
      400,
      `PDF has more than ${limit} pages. Split the document or raise OCR_MAX_PDF_PAGES.`
    );
  }

  for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale: renderScale });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );
    const context = canvas.getContext("2d");

    await page.render({
      canvasContext: context,
      viewport,
      canvas,
    }).promise;

    const imageBuffer = canvas.toBuffer("image/png");

    if (imageBuffer.length > MAX_OCR_IMAGE_BYTES) {
      throw httpError(
        400,
        `Page ${pageNum} is too large for OCR at the current render scale. Try a lower-resolution scan.`
      );
    }

    pages.push({
      page: pageNum,
      buffer: imageBuffer,
      mimeType: "image/png",
      fileName: `page-${pageNum}.png`,
    });

    if (onPage) onPage({ page: pageNum, total: pageCount });
  }

  return pages;
}

module.exports = { rasterizePdfToImages };
