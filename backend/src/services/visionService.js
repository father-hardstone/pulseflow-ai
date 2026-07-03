const config = require("../config");
const { httpError } = require("../helpers/errors");
const { requireConfig } = require("../helpers/requireConfig");

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_VISION_IMAGE_BYTES = 3 * 1024 * 1024;

function mimeForImage(fileName, mimeType) {
  const mt = String(mimeType || "").toLowerCase();
  if (mt.startsWith("image/")) return mt;
  const ext = String(fileName || "").toLowerCase();
  if (ext.endsWith(".png")) return "image/png";
  if (ext.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function assertVisionImageSize(buffer, label) {
  if (buffer.length > MAX_VISION_IMAGE_BYTES) {
    throw httpError(
      400,
      `${label || "Image"} is too large for vision processing (${(buffer.length / (1024 * 1024)).toFixed(1)} MB). Use a smaller image.`
    );
  }
}

async function groqVisionComplete(
  imageBuffer,
  {
    prompt,
    fileName = "",
    mimeType = "",
    temperature = 0.2,
    maxTokens = 4096,
    errorLabel = "Groq vision request failed",
  } = {}
) {
  requireConfig("ocr");
  assertVisionImageSize(imageBuffer, fileName || "Image");

  const mime = mimeForImage(fileName, mimeType);
  const dataUrl = `data:${mime};base64,${imageBuffer.toString("base64")}`;

  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.groq.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.groq.modelVision,
      temperature,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `${errorLabel} (${res.status})`;
    throw httpError(res.status >= 400 && res.status < 500 ? 400 : 502, msg);
  }

  const text = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!text) {
    throw httpError(400, `${errorLabel}: empty response from vision model.`);
  }
  return text;
}

module.exports = {
  groqVisionComplete,
  mimeForImage,
  assertVisionImageSize,
  MAX_VISION_IMAGE_BYTES,
};
