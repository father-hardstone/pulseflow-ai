import type { LucideIcon } from "lucide-react";

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "rose",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  accent?: "rose" | "emerald" | "amber" | "violet" | "sky";
}) {
  const accents = {
    rose: "from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/20",
    emerald: "from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20",
    amber: "from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/20",
    violet: "from-violet-500/20 to-violet-600/5 text-violet-400 border-violet-500/20",
    sky: "from-sky-500/20 to-sky-600/5 text-sky-400 border-sky-500/20",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 ${accents[accent]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-fg">{value}</p>
          {hint && <p className="mt-1 text-xs text-fg-muted">{hint}</p>}
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-black/20">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export function formatAdminDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
