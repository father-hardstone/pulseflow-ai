/**
 * pdfjs-dist expects browser globals. Load @napi-rs/canvas first on Node/serverless.
 */
const path = require("node:path");

let polyfillPromise;

function ensurePdfCanvasGlobals() {
  if (polyfillPromise) return polyfillPromise;

  polyfillPromise = Promise.resolve().then(() => {
    // Help Vercel's file tracer include pdfjs + native canvas in the bundle.
    require.resolve("pdfjs-dist/package.json");

    const canvas = require("@napi-rs/canvas");
    const g = globalThis;

    if (!g.DOMMatrix && canvas.DOMMatrix) g.DOMMatrix = canvas.DOMMatrix;
    if (!g.ImageData && canvas.ImageData) g.ImageData = canvas.ImageData;
    if (!g.Path2D && canvas.Path2D) g.Path2D = canvas.Path2D;
    if (!g.Image && canvas.Image) g.Image = canvas.Image;

    return path.dirname(require.resolve("pdfjs-dist/package.json"));
  });

  return polyfillPromise;
}

module.exports = { ensurePdfCanvasGlobals };
