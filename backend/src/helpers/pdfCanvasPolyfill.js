/**
 * pdfjs-dist expects browser globals. Load @napi-rs/canvas first on Node/serverless.
 */
let polyfillPromise;

async function ensurePdfCanvasGlobals() {
  if (polyfillPromise) return polyfillPromise;

  polyfillPromise = (async () => {
    const canvas = await import("@napi-rs/canvas");
    const g = globalThis;

    if (!g.DOMMatrix && canvas.DOMMatrix) g.DOMMatrix = canvas.DOMMatrix;
    if (!g.ImageData && canvas.ImageData) g.ImageData = canvas.ImageData;
    if (!g.Path2D && canvas.Path2D) g.Path2D = canvas.Path2D;
    if (!g.Image && canvas.Image) g.Image = canvas.Image;
  })();

  return polyfillPromise;
}

module.exports = { ensurePdfCanvasGlobals };
