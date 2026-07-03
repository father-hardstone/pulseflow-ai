import { useEffect, useMemo, useState } from "react";
import {
  Database,
  Link2,
  FileText,
  Trash2,
  Plus,
  Loader2,
  Youtube,
  ExternalLink,
  Layers,
  FileStack,
  CheckCircle2,
  Upload,
  FileType,
  ImageIcon,
  Search,
  X,
  Sparkles,
} from "lucide-react";
import { api, type KnowledgeItem, type KnowledgeSearchMatch } from "../lib/api";
import StatusBadge from "./StatusBadge";
import DeleteKnowledgeModal from "./DeleteKnowledgeModal";
import IngestProgress, {
  applyIngestStepEvent,
  buildIngestSteps,
  fileSupportsVision,
  isImageFile,
  isPdfFile,
  type IngestMode,
  type IngestStepId,
  type IngestStepState,
} from "./IngestProgress";

const ACCEPTED_FILE_TYPES =
  ".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/png,image/jpeg,image/webp";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function sourceIcon(item: KnowledgeItem) {
  if (item.source_type === "youtube") return Youtube;
  if (item.source_type === "url") return Link2;
  if (item.source_type === "image" || item.source_type === "image_analysis") return ImageIcon;
  if (item.source_type === "pdf" || item.source_type === "pdf_analysis" || item.source_type === "docx" || item.source_type === "txt") {
    return FileType;
  }
  return FileText;
}

function sourceTypeMeta(type: string) {
  if (type === "youtube") {
    return {
      label: "YouTube",
      className:
        "border-rose-400/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    };
  }
  if (type === "url") {
    return {
      label: "Web URL",
      className: "border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    };
  }
  if (type === "pdf_analysis") {
    return {
      label: "PDF analysis",
      className: "border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    };
  }
  if (type === "pdf") {
    return {
      label: "PDF",
      className: "border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }
  if (type === "image" || type === "image_analysis") {
    return {
      label: type === "image_analysis" ? "Image analysis" : "Image",
      className: "border-violet-400/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    };
  }
  if (type === "docx") {
    return {
      label: "DOCX",
      className: "border-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    };
  }
  if (type === "txt") {
    return {
      label: "TXT",
      className: "border-teal-400/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    };
  }
  return {
    label: "Text",
    className:
      "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  };
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedFile(file: File) {
  const name = file.name.toLowerCase();
  return /\.(pdf|docx|txt|png|jpe?g|webp)$/i.test(name);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return "";
}

function shortId(id: string) {
  return id.slice(0, 8);
}

export default function KnowledgePanel({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<IngestMode>("file");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [useOcr, setUseOcr] = useState(false);
  const [useMetaAnalysis, setUseMetaAnalysis] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ingestSteps, setIngestSteps] = useState<IngestStepState[] | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeSearchMatch[] | null>(null);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const stats = useMemo(() => {
    const totalChunks = items.reduce((s, i) => s + (i.chunk_count || 0), 0);
    const ready = items.filter((i) => i.status === "ready").length;
    const maxChunks = Math.max(...items.map((i) => i.chunk_count || 0), 1);
    return { totalChunks, ready, maxChunks };
  }, [items]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.listKnowledge();
      setItems(res.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError("");
    try {
      const res = await api.searchKnowledge(q, 8);
      setSearchResults(res.matches);
      setSearchedQuery(q);
    } catch (err) {
      setSearchError((err as Error).message);
      setSearchResults([]);
      setSearchedQuery(q);
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
    setSearchedQuery("");
    setSearchError("");
  }

  function pickFile(next: File | null) {
    if (!next) {
      setFile(null);
      setUseOcr(false);
      setUseMetaAnalysis(false);
      return;
    }
    if (!isAcceptedFile(next)) {
      setError("Unsupported file type. Upload PDF, DOCX, TXT, or an image (PNG, JPG, WEBP).");
      setFile(null);
      return;
    }
    if (next.size > MAX_FILE_BYTES) {
      setError("File too large. Maximum upload size is 10 MB.");
      setFile(null);
      return;
    }
    setError("");
    setFile(next);
    setUseOcr(false);
    setUseMetaAnalysis(false);
  }

  const visionFile = mode === "file" && fileSupportsVision(file);
  const showAnalyzePipeline = visionFile && useMetaAnalysis;
  const showOcrPipeline = visionFile && useOcr;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "url" && !sourceUrl.trim()) {
      setError("Enter a blog or YouTube URL.");
      return;
    }
    if (mode === "text" && !text.trim()) {
      setError("Paste some content to ingest.");
      return;
    }
    if (mode === "file" && !file) {
      setError("Choose a PDF, DOCX, TXT, or image file to upload.");
      return;
    }

    if (mode === "file" && file && isImageFile(file) && !useMetaAnalysis && !useOcr) {
      setError("For images, enable meta analysis and/or OCR — or use a PDF/DOCX/TXT file instead.");
      return;
    }

    setSubmitting(true);
    setShowProgress(true);
    setIngestSteps(
      buildIngestSteps(mode, { ocr: showOcrPipeline, analyze: showAnalyzePipeline })
    );

    try {
      if (mode === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        if (title.trim()) formData.append("title", title.trim());
        if (visionFile) {
          formData.append("useMetaAnalysis", useMetaAnalysis ? "true" : "false");
          formData.append("useOcr", useOcr ? "true" : "false");
        }

        await api.addKnowledgeUploadStream(formData, (event) => {
          if (event.type === "step") {
            setIngestSteps((prev) =>
              applyIngestStepEvent(
                prev ||
                  buildIngestSteps(mode, {
                    ocr: showOcrPipeline,
                    analyze: showAnalyzePipeline,
                  }),
                event.step as IngestStepId,
                event.status,
                event.detail
              )
            );
          }
        });
      } else {
        const payload = mode === "url" ? { title, sourceUrl } : { title, text };

        await api.addKnowledgeStream(payload, (event) => {
          if (event.type === "step") {
            setIngestSteps((prev) =>
              applyIngestStepEvent(
                prev || buildIngestSteps(mode),
                event.step as IngestStepId,
                event.status,
                event.detail
              )
            );
          }
        });
      }

      setTitle("");
      setSourceUrl("");
      setText("");
      setFile(null);
      setUseOcr(false);
      setUseMetaAnalysis(false);
      await load();
      onChanged();
      setTimeout(() => {
        setShowProgress(false);
        setIngestSteps(null);
      }, 4000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteKnowledge(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="min-w-0 lg:h-full lg:min-h-0">
        <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
        {/* Add form */}
        <div className="card flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          <div className="scrollbar-slim overflow-y-auto p-4 sm:p-6 lg:min-h-0 lg:flex-1">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
              <Plus className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-fg">Add to Knowledge Base</h3>
          </div>
          <p className="mt-2 text-sm text-fg-muted">
            Upload a document or image, paste text, or add a URL. Photos can be analyzed for scene
            context; documents and scans can use OCR — then everything is chunked and embedded for
            RAG.
          </p>

          <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-surface-line bg-ink-900/60 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                { id: "file", label: "Upload file" },
                { id: "text", label: "Paste text" },
                { id: "url", label: "URL / Video" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  setError("");
                }}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition sm:px-4 ${
                  mode === m.id ? "bg-brand-600 text-white" : "text-fg-muted hover:text-fg"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="label">Title (optional)</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Product one-pager"
              />
            </div>

            {mode === "file" ? (
              <div>
                <label className="label">Document</label>
                <label
                  className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition ${
                    file
                      ? "border-brand-400/40 bg-brand-500/5"
                      : "border-surface-line bg-ink-900/40 hover:border-brand-400/30 hover:bg-brand-500/5"
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pickFile(e.dataTransfer.files?.[0] || null);
                  }}
                >
                  <Upload className="h-8 w-8 text-brand-300" />
                  <p className="mt-3 text-sm font-medium text-fg">
                    {file ? file.name : "Drop a file here or click to browse"}
                  </p>
                  <p className="mt-1 text-xs text-fg-muted">
                    PDF, DOCX, TXT, PNG, JPG, WEBP · up to {formatFileSize(MAX_FILE_BYTES)}
                  </p>
                  {file && (
                    <p className="mt-2 text-xs text-fg-muted">{formatFileSize(file.size)}</p>
                  )}
                  <input
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    className="sr-only"
                    onChange={(e) => pickFile(e.target.files?.[0] || null)}
                  />
                </label>
                {file && (
                  <button
                    type="button"
                    className="mt-2 text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline"
                    onClick={() => pickFile(null)}
                  >
                    Remove file
                  </button>
                )}
                {visionFile && (
                  <div className="mt-4 space-y-3 rounded-xl border border-surface-line bg-ink-900/40 px-4 py-3">
                    <p className="text-sm font-medium text-fg">Vision processing</p>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1 hover:bg-surface-overlay/40">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-surface-line text-brand-500 focus:ring-brand-500/40"
                        checked={useMetaAnalysis}
                        onChange={(e) => setUseMetaAnalysis(e.target.checked)}
                      />
                      <span>
                        <span className="block text-sm font-medium text-fg">Meta analysis</span>
                        <span className="mt-0.5 block text-xs text-fg-muted">
                          Describes scenes, themes, key elements, and any visible text in context.
                          Can be combined with OCR or used on its own.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1 hover:bg-surface-overlay/40">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-surface-line text-brand-500 focus:ring-brand-500/40"
                        checked={useOcr}
                        onChange={(e) => setUseOcr(e.target.checked)}
                      />
                      <span>
                        <span className="block text-sm font-medium text-fg">
                          Extract text (OCR)
                        </span>
                        <span className="mt-0.5 block text-xs text-fg-muted">
                          Literal text extraction for screenshots and documents. Can be combined
                          with meta analysis.
                        </span>
                      </span>
                    </label>
                    {isPdfFile(file) && !useMetaAnalysis && !useOcr && (
                      <p className="text-xs text-fg-muted">
                        With both off, only the PDF embedded text layer is used.
                      </p>
                    )}
                    {isImageFile(file) && !useMetaAnalysis && !useOcr && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Images need at least one vision option enabled.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : mode === "text" ? (
              <div>
                <label className="label">Content</label>
                <textarea
                  className="input min-h-32 resize-y"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your case study, docs, or messaging..."
                />
              </div>
            ) : (
              <div>
                <label className="label">Blog / YouTube URL</label>
                <input
                  className="input"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or blog post URL"
                  type="url"
                />
                <p className="mt-1.5 text-xs text-fg-muted">
                  YouTube: uses available captions (manual or auto-generated).
                </p>
              </div>
            )}

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <IngestProgress
              steps={
                ingestSteps ||
                buildIngestSteps(mode, {
                  ocr: showOcrPipeline,
                  analyze: showAnalyzePipeline,
                })
              }
              visible={showProgress}
            />

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting
                ? mode === "file"
                  ? "Extracting & vectorizing..."
                  : "Fetching & vectorizing..."
                : "Ingest content"}
            </button>
          </form>
          </div>
        </div>

        {/* Context library table */}
        <div className="card flex min-w-0 flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          <div className="shrink-0 border-b border-surface-line px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
                  <Database className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="font-semibold text-fg">Context Library</h3>
                  <p className="text-xs text-fg-muted">Indexed sources for RAG retrieval</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge border border-surface-line bg-surface-overlay text-fg-body">
                  <Layers className="h-3.5 w-3.5" /> {items.length} sources
                </span>
                <span className="badge border border-surface-line bg-surface-overlay text-fg-body">
                  <FileStack className="h-3.5 w-3.5" /> {stats.totalChunks} chunks
                </span>
                <span className="badge border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {stats.ready} ready
                </span>
              </div>
            </div>

            {items.length > 0 && (
              <form onSubmit={runSearch} className="mt-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                  <input
                    className="input pl-9 pr-9"
                    placeholder="Search by meaning — e.g. “our refund policy”"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {(searchQuery || searchResults !== null) && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-fg-muted transition hover:bg-surface-overlay hover:text-fg"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn-primary shrink-0 px-4"
                  disabled={searching || !searchQuery.trim()}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Search</span>
                </button>
              </form>
            )}
          </div>

          <div className="min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {searchResults !== null ? (
              <div className="p-4 sm:p-6">
                <div className="mb-3 flex items-center gap-2 text-sm text-fg-muted">
                  <Sparkles className="h-4 w-4 text-brand-300" />
                  {searching ? (
                    <span>Searching…</span>
                  ) : (
                    <span>
                      {searchResults.length} relevant{" "}
                      {searchResults.length === 1 ? "chunk" : "chunks"} for{" "}
                      <span className="font-medium text-fg">“{searchedQuery}”</span>
                    </span>
                  )}
                </div>

                {searchError ? (
                  <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                    {searchError}
                  </p>
                ) : searching ? (
                  <div className="grid place-items-center py-12 text-fg-muted">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="grid place-items-center rounded-xl border border-dashed border-surface-line py-12 text-center">
                    <Search className="h-8 w-8 text-fg-muted" />
                    <p className="mt-3 font-medium text-fg">No close matches</p>
                    <p className="mt-1 max-w-xs text-sm text-fg-muted">
                      Try rephrasing, or ingest more content so the library has related context.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {searchResults.map((m, i) => {
                      const pct =
                        m.similarity != null ? Math.round(m.similarity * 100) : null;
                      return (
                        <li
                          key={`${m.kbId ?? "src"}-${i}`}
                          className="rounded-xl border border-surface-line bg-ink-900/40 p-4"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-fg-muted" />
                              <span className="truncate text-sm font-medium text-fg">
                                {m.title ?? "Untitled source"}
                              </span>
                            </div>
                            {pct != null && (
                              <span className="badge shrink-0 border border-brand-400/30 bg-brand-500/10 text-brand-700 dark:text-brand-300">
                                {pct}% match
                              </span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-body">
                            {m.content}
                          </p>
                          {m.sourceUrl && (
                            <a
                              href={m.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300"
                            >
                              <span className="max-w-[280px] truncate">{m.sourceUrl}</span>
                              <ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : loading ? (
              <div className="grid h-full place-items-center text-fg-muted">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="grid h-full place-items-center px-6 text-center">
                <div>
                  <Database className="mx-auto h-10 w-10 text-fg-muted" />
                  <p className="mt-3 font-medium text-fg">No content yet</p>
                  <p className="mt-1 text-sm text-fg-muted">
                    Upload a document, paste text, or add a URL to build your context library.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-surface-line-subtle lg:hidden">
                  {items.map((item) => {
                    const Icon = sourceIcon(item);
                    const typeMeta = sourceTypeMeta(item.source_type);
                    const chunkPct = Math.round(
                      ((item.chunk_count || 0) / stats.maxChunks) * 100
                    );

                    return (
                      <li key={item.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${typeMeta.className}`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-fg">{item.title}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className={`badge border ${typeMeta.className}`}>
                                  {typeMeta.label}
                                </span>
                                <StatusBadge status={item.status} />
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fg-muted transition hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400"
                            title="Delete source"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-fg-muted">
                          {item.source_url ? (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-fg-body hover:text-brand-400"
                            >
                              <span className="truncate">{item.source_url}</span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </a>
                          ) : (
                            <span>Uploaded / pasted content</span>
                          )}
                          <div className="flex items-center justify-between gap-3">
                            <span>
                              {item.chunk_count} chunks · {formatDate(item.created_at)}
                            </span>
                            <span>{relativeTime(item.created_at)}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                              style={{ width: `${chunkPct}%` }}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="scrollbar-slim hidden min-w-0 lg:block">
                <table className="w-full table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-12" />
                    <col />
                    <col />
                    <col className="w-[88px]" />
                    <col className="w-[96px]" />
                    <col className="w-[108px]" />
                    <col className="w-14" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-ink-800/95 text-xs uppercase tracking-wide text-fg-muted backdrop-blur">
                    <tr className="border-b border-surface-line">
                      <th className="px-3 py-3 font-medium xl:px-4">Type</th>
                      <th className="px-3 py-3 font-medium xl:px-4">Title</th>
                      <th className="px-3 py-3 font-medium xl:px-4">Source</th>
                      <th className="px-3 py-3 font-medium xl:px-4">Vectors</th>
                      <th className="px-3 py-3 font-medium xl:px-4">Status</th>
                      <th className="px-3 py-3 font-medium xl:px-4">Ingested</th>
                      <th className="px-3 py-3 text-right font-medium xl:px-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-line-subtle">
                    {items.map((item) => {
                      const Icon = sourceIcon(item);
                      const typeMeta = sourceTypeMeta(item.source_type);
                      const chunkPct = Math.round(
                        ((item.chunk_count || 0) / stats.maxChunks) * 100
                      );

                      return (
                        <tr
                          key={item.id}
                          className="transition-colors hover:bg-surface-overlay/60"
                        >
                          <td className="px-3 py-3 xl:px-4 xl:py-3.5">
                            <span
                              title={typeMeta.label}
                              className={`grid h-9 w-9 place-items-center rounded-lg border ${typeMeta.className}`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                          </td>
                          <td className="max-w-0 px-3 py-3 xl:px-4 xl:py-3.5">
                            <p className="truncate font-medium text-fg" title={item.title}>
                              {item.title}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-xs text-fg-muted">
                              {typeMeta.label} · {shortId(item.id)}
                            </p>
                          </td>
                          <td className="max-w-0 px-3 py-3 xl:px-4 xl:py-3.5">
                            {item.source_url ? (
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={item.source_url}
                                className="group flex min-w-0 items-center gap-1 text-fg-body hover:text-brand-400"
                              >
                                <span className="truncate">{item.source_url}</span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                              </a>
                            ) : ["pdf", "pdf_analysis", "docx", "txt", "image", "image_analysis"].includes(
                                item.source_type
                              ) ? (
                              <span className="block truncate text-fg-muted" title={item.source_type}>
                                Uploaded file
                              </span>
                            ) : (
                              <span className="text-fg-muted">Pasted text</span>
                            )}
                          </td>
                          <td className="px-3 py-3 xl:px-4 xl:py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold tabular-nums text-fg">
                                {item.chunk_count}
                              </span>
                              <div className="hidden min-w-0 flex-1 sm:block">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                                    style={{ width: `${chunkPct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 xl:px-4 xl:py-3.5">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="max-w-0 px-3 py-3 xl:px-4 xl:py-3.5">
                            <p className="truncate text-sm text-fg-body" title={formatDate(item.created_at)}>
                              {formatDate(item.created_at)}
                            </p>
                            <p className="hidden truncate text-xs text-fg-muted xl:block">
                              {relativeTime(item.created_at)}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right xl:px-4 xl:py-3.5">
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="inline-flex items-center justify-center rounded-lg border border-transparent p-2 text-fg-muted transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400"
                              title="Delete source"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </div>

      <DeleteKnowledgeModal
        item={deleteTarget}
        busy={deleting}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
