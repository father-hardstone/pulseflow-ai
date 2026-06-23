const config = require("../config");
const { requireConfig } = require("../helpers/requireConfig");
const { httpError } = require("../helpers/errors");

// HuggingFace Inference API embeddings (all-MiniLM-L6-v2, 384 dims).
// Required integration — no local fallback (fail fast if unconfigured).
let clientPromise = null;

async function getClient() {
  if (!clientPromise) {
    clientPromise = import("@huggingface/inference").then(
      (mod) => new mod.InferenceClient(config.huggingface.apiKey)
    );
  }
  return clientPromise;
}

function assertVector(vec) {
  if (!Array.isArray(vec) || vec.length === 0 || typeof vec[0] !== "number") {
    throw httpError(502, "HuggingFace returned an unexpected embedding shape");
  }
  if (vec.length !== config.embeddingDimensions) {
    throw httpError(
      502,
      `Embedding dimension mismatch: got ${vec.length}, expected ${config.embeddingDimensions}. Check HUGGINGFACE_EMBEDDING_MODEL.`
    );
  }
  return vec;
}

async function embedTexts(texts) {
  requireConfig("embeddings");
  const list = Array.isArray(texts) ? texts : [texts];
  const client = await getClient();
  const output = await client.featureExtraction({
    model: config.huggingface.model,
    inputs: list,
  });
  // Single input => number[]; multiple => number[][].
  const vectors = Array.isArray(output[0]) ? output : [output];
  return vectors.map(assertVector);
}

async function embedText(text) {
  const [vec] = await embedTexts([text]);
  return vec;
}

function embeddingProvider() {
  return "huggingface";
}

module.exports = { embedTexts, embedText, embeddingProvider };
