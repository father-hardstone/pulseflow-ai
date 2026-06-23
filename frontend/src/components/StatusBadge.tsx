import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

type Status = "pending" | "processing" | "completed" | "failed" | "ready";

const MAP: Record<
  Status,
  { label: string; className: string; icon: typeof Clock; spin?: boolean }
> = {
  pending: {
    label: "Pending",
    className:
      "bg-slate-500/15 text-slate-600 border border-slate-400/30 dark:text-slate-300 dark:border-slate-400/20",
    icon: Clock,
  },
  processing: {
    label: "Processing",
    className:
      "bg-amber-500/15 text-amber-700 border border-amber-400/30 dark:text-amber-300 dark:border-amber-400/20",
    icon: Loader2,
    spin: true,
  },
  ready: {
    label: "Ready",
    className:
      "bg-emerald-500/15 text-emerald-700 border border-emerald-400/30 dark:text-emerald-300 dark:border-emerald-400/20",
    icon: CheckCircle2,
  },
  completed: {
    label: "Completed",
    className:
      "bg-emerald-500/15 text-emerald-700 border border-emerald-400/30 dark:text-emerald-300 dark:border-emerald-400/20",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className:
      "bg-rose-500/15 text-rose-700 border border-rose-400/30 dark:text-rose-300 dark:border-rose-400/20",
    icon: XCircle,
  },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = MAP[(status as Status)] ?? MAP.pending;
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.className}`}>
      <Icon className={`h-3.5 w-3.5 ${cfg.spin ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}
