const { groqVisionComplete } = require("./visionService");

const IMAGE_ANALYSIS_PROMPT = `You are analyzing an image for a searchable knowledge base. Write a concise, factual description in plain text.

Structure your response with these sections (use the exact labels):

OVERVIEW
2-4 sentences describing what the image shows.

THEME & SETTING
The mood, environment, and broader context (e.g. rural farm, office, product photo).

KEY ELEMENTS
Short lines listing important objects, people, animals, activities, or focal subjects.

VISIBLE TEXT
Any readable text, signs, labels, or writing in the image and what it means in context. If there is little or no text, say "Little to no readable text detected" and briefly note any partial or ambiguous markings.

Rules:
- Be factual; do not invent details you cannot see.
- No markdown formatting beyond the section labels above.
- Suitable for retrieval-augmented search about this image.`;

async function analyzeImageBuffer(buffer, { fileName = "", mimeType = "" } = {}) {
  const raw = await groqVisionComplete(buffer, {
    prompt: IMAGE_ANALYSIS_PROMPT,
    fileName,
    mimeType,
    temperature: 0.35,
    maxTokens: 2048,
    errorLabel: "Image analysis failed",
  });

  return raw.trim();
}

async function analyzeImagePages(pages, { onPage } = {}) {
  const parts = [];
  const total = pages.length;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageNum = page.page ?? i + 1;
    if (onPage) onPage({ page: pageNum, total, status: "running" });

    const analysis = await analyzeImageBuffer(page.buffer, {
      fileName: page.fileName || `page-${pageNum}.png`,
      mimeType: page.mimeType || "image/png",
    });

    parts.push(analysis);
    if (onPage) onPage({ page: pageNum, total, status: "done", characters: analysis.length });
  }

  return parts
    .map((t, i) => {
      if (total <= 1) return t;
      return `--- Page ${i + 1} analysis ---\n${t}`;
    })
    .join("\n\n")
    .trim();
}

module.exports = { analyzeImageBuffer, analyzeImagePages, IMAGE_ANALYSIS_PROMPT };
