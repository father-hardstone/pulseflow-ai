import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import type { KnowledgeItem } from "../lib/api";

interface DeleteKnowledgeModalProps {
  item: KnowledgeItem | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteKnowledgeModal({
  item,
  busy = false,
  onClose,
  onConfirm,
}: DeleteKnowledgeModalProps) {
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-surface-scrim p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-surface-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/15 text-rose-500 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-semibold text-fg">Delete knowledge source?</h3>
              <p className="text-sm text-fg-muted">This cannot be undone.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-overlay-hover hover:text-fg disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl border border-surface-line-subtle bg-ink-900/50 p-4">
            <p className="font-medium text-fg">{item.title}</p>
            <p className="mt-1 truncate text-sm text-fg-muted">
              {item.source_url || "Pasted text content"}
            </p>
            <p className="mt-2 text-xs text-fg-muted">
              {item.chunk_count} vector chunk{item.chunk_count === 1 ? "" : "s"} will be removed from
              Supabase.
            </p>
          </div>
          <p className="text-sm text-fg-muted">
            Outreach generation will no longer retrieve context from this source.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-surface-line px-6 py-4">
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="btn bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete source
          </button>
        </div>
      </div>
    </div>
  );
}
