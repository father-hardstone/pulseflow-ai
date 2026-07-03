const { pdf } = require("pdf-to-img");
const config = require("../config");
const { httpError } = require("../helpers/errors");
const { MAX_OCR_IMAGE_BYTES } = require("./ocrService");

async function rasterizePdfToImages(buffer, { maxPages, scale, onPage } = {}) {
  const limit = maxPages ?? config.ocr.maxPdfPages;
  const renderScale = scale ?? config.ocr.pdfScale;
  const pages = [];

  let doc;
  try {
    doc = await pdf(buffer, { scale: renderScale });
  } catch (err) {
    throw httpError(400, `Failed to read PDF for OCR: ${err.message}`);
  }

  let pageNum = 0;
  for await (const imageBuffer of doc) {
    pageNum += 1;
    if (pageNum > limit) {
      throw httpError(
        400,
        `PDF has more than ${limit} pages. Split the document or raise OCR_MAX_PDF_PAGES.`
      );
    }

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

    if (onPage) onPage({ page: pageNum, total: null });
  }

  if (pages.length === 0) {
    throw httpError(400, "PDF contains no pages to OCR.");
  }

  return pages;
}

module.exports = { rasterizePdfToImages };
