const { httpError } = require("../helpers/errors");
const { groqVisionComplete, MAX_VISION_IMAGE_BYTES } = require("./visionService");

const OCR_PROMPT =
  "Extract all visible text from this image. Return plain text only, preserving paragraphs and reading order. Do not add commentary, markdown, or labels.";

async function groqVisionOcr(imageBuffer, { fileName = "", mimeType = "" } = {}) {
  const text = await groqVisionComplete(imageBuffer, {
    prompt: OCR_PROMPT,
    fileName,
    mimeType,
    temperature: 0,
    maxTokens: 4096,
    errorLabel: "Groq vision OCR failed",
  });

  if (!text) {
    throw httpError(400, "OCR returned no text. Try a clearer image or higher contrast scan.");
  }
  return text;
}

async function ocrImageBuffer(buffer, options = {}) {
  return groqVisionOcr(buffer, options);
}

async function ocrImagePages(pages, { onPage } = {}) {
  const parts = [];
  const total = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageNum = page.page ?? i + 1;
    if (onPage) onPage({ page: pageNum, total, status: "running" });

    const text = await groqVisionOcr(page.buffer, {
      fileName: page.fileName || `page-${pageNum}.png`,
      mimeType: page.mimeType || "image/png",
    });

    parts.push(text);
    if (onPage) onPage({ page: pageNum, total, status: "done", characters: text.length });
  }

  return parts
    .map((t, i) => {
      if (total <= 1) return t;
      return `--- Page ${i + 1} ---\n${t}`;
    })
    .join("\n\n")
    .trim();
}

module.exports = {
  ocrImageBuffer,
  ocrImagePages,
  groqVisionOcr,
  MAX_OCR_IMAGE_BYTES: MAX_VISION_IMAGE_BYTES,
};
