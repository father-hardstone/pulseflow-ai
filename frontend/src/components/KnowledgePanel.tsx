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
} from "lucide-react";
import { api, type KnowledgeItem } from "../lib/api";
import StatusBadge from "./StatusBadge";
import DeleteKnowledgeModal from "./DeleteKnowledgeModal";
import IngestProgress, {
  applyIngestStepEvent,
  buildIngestSteps,
  type IngestStepId,
  type IngestStepState,
} from "./IngestProgress";

function sourceIcon(item: KnowledgeItem) {
  if (item.source_type === "youtube") return Youtube;
  if (item.source_type === "url") return Link2;
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
  return {
    label: "Text",
    className:
      "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  };
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
  const [mode, setMode] = useState<"url" | "text">("url");
  const [title, setTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ingestSteps, setIngestSteps] = useState<IngestStepState[] | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    setShowProgress(true);
    setIngestSteps(buildIngestSteps(mode));

    const payload = mode === "url" ? { title, sourceUrl } : { title, text };

    try {
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
      setTitle("");
      setSourceUrl("");
      setText("");
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
      <div className="h-full min-h-0">
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[380px_1fr]">
        {/* Add form */}
        <div className="card flex min-h-0 flex-col overflow-hidden">
          <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
              <Plus className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-fg">Add to Knowledge Base</h3>
          </div>
          <p className="mt-2 text-sm text-fg-muted">
            Paste a blog URL, YouTube link (we pull captions), or raw text — then we chunk, embed, and
            store it for RAG.
          </p>

          <div className="mt-5 inline-flex rounded-xl border border-surface-line bg-ink-900/60 p-1">
            {(["url", "text"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
                  mode === m ? "bg-brand-600 text-white" : "text-fg-muted hover:text-fg"
                }`}
              >
                {m === "url" ? "URL / Video" : "Paste text"}
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

            {mode === "url" ? (
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
            ) : (
              <div>
                <label className="label">Content</label>
                <textarea
                  className="input min-h-32 resize-y"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your case study, docs, or messaging..."
                />
              </div>
            )}

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <IngestProgress steps={ingestSteps || buildIngestSteps(mode)} visible={showProgress} />

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {submitting ? "Fetching & vectorizing..." : "Ingest content"}
            </button>
          </form>
          </div>
        </div>

        {/* Context library table */}
        <div className="card flex min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-surface-line px-6 py-4">
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
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {loading ? (
              <div className="grid h-full place-items-center text-fg-muted">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="grid h-full place-items-center px-6 text-center">
                <div>
                  <Database className="mx-auto h-10 w-10 text-fg-muted" />
                  <p className="mt-3 font-medium text-fg">No content yet</p>
                  <p className="mt-1 text-sm text-fg-muted">
                    Add a URL or paste text to build your context library.
                  </p>
                </div>
              </div>
            ) : (
              <div className="scrollbar-slim h-full overflow-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-ink-800/95 text-xs uppercase tracking-wide text-fg-muted backdrop-blur">
                    <tr className="border-b border-surface-line">
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Title</th>
                      <th className="px-5 py-3 font-medium">Source</th>
                      <th className="px-5 py-3 font-medium">Vectors</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Ingested</th>
                      <th className="px-5 py-3 text-right font-medium">Actions</th>
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
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`grid h-9 w-9 place-items-center rounded-lg border ${typeMeta.className}`}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span
                                className={`badge border ${typeMeta.className}`}
                              >
                                {typeMeta.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="max-w-[200px] truncate font-medium text-fg lg:max-w-xs">
                              {item.title}
                            </p>
                            <p className="mt-0.5 font-mono text-xs text-fg-muted">
                              id · {shortId(item.id)}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            {item.source_url ? (
                              <a
                                href={item.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex max-w-[220px] items-center gap-1.5 text-fg-body hover:text-brand-400 lg:max-w-xs"
                              >
                                <span className="truncate">{item.source_url}</span>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100" />
                              </a>
                            ) : (
                              <span className="text-fg-muted">Pasted content</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="min-w-[100px]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold tabular-nums text-fg">
                                  {item.chunk_count}
                                </span>
                                <span className="text-xs text-fg-muted">chunks</span>
                              </div>
                              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                                  style={{ width: `${chunkPct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-fg-body">{formatDate(item.created_at)}</p>
                            <p className="text-xs text-fg-muted">
                              {relativeTime(item.created_at)}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3 py-1.5 text-fg-muted transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500 dark:hover:text-rose-400"
                              title="Delete source"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="text-xs font-medium">Delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
