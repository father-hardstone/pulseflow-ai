export interface OcrDebugMeta {
  at: string;
  stage: string;
  fileName: string | null;
  mimeType: string | null;
  sourceType: string;
  extractionMethod: string;
  useMetaAnalysis?: boolean;
  useOcrRequested: boolean | null;
  visionModel: string;
  characters: number;
  lineCount: number;
  pageCount: number | null;
  userId: string | null;
  truncated: boolean;
}

export interface OcrDebugEvent {
  type: "ocr_debug";
  meta: OcrDebugMeta;
  preview: string;
}

function isOcrDebugEnabled() {
  const flag = import.meta.env.VITE_DEBUG_OCR;
  if (flag === "0" || flag === "false") return false;
  if (flag === "1" || flag === "true") return true;
  return import.meta.env.DEV;
}

/** Log OCR extract output in the browser devtools console (before chunk/embed). */
export function logOcrDebugInBrowser(event: OcrDebugEvent) {
  if (!isOcrDebugEnabled()) return;

  const label =
    event.meta.extractionMethod === "vision-combined"
      ? `[VISION DEBUG] Combined extract · ${event.meta.fileName || event.meta.sourceType}`
      : event.meta.extractionMethod === "vision-analysis"
        ? `[VISION DEBUG] Pre-ingest analysis · ${event.meta.fileName || event.meta.sourceType}`
        : `[OCR DEBUG] Pre-ingest extract · ${event.meta.fileName || event.meta.sourceType}`;

  console.groupCollapsed(
    `%c${label.split(" · ")[0]}%c · ${event.meta.fileName || event.meta.sourceType}`,
    "color:#a78bfa;font-weight:bold",
    "color:inherit;font-weight:normal"
  );
  console.log("Meta", event.meta);
  console.log(
    event.meta.extractionMethod === "vision-analysis" ||
      event.meta.extractionMethod === "vision-combined"
      ? "--- vision output (before ingest) ---"
      : "--- extracted text (before ingest) ---"
  );
  console.log(event.preview);
  if (event.meta.truncated) {
    console.info(`Full text is ${event.meta.characters.toLocaleString()} characters (preview truncated in stream).`);
  }
  console.groupEnd();
}
