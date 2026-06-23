// LangChain RecursiveCharacterTextSplitter (SRS Module A). The package is
// ESM-only, so we load it via dynamic import and cache the class.
let splitterClassPromise = null;

async function getSplitterClass() {
  if (!splitterClassPromise) {
    splitterClassPromise = import("@langchain/textsplitters").then(
      (mod) => mod.RecursiveCharacterTextSplitter
    );
  }
  return splitterClassPromise;
}

async function splitText(text, { chunkSize = 1000, chunkOverlap = 150 } = {}) {
  const clean = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const RecursiveCharacterTextSplitter = await getSplitterClass();
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap });
  const chunks = await splitter.splitText(clean);
  return chunks.map((c) => c.trim()).filter((c) => c.length > 0);
}

module.exports = { splitText };
