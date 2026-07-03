import { useEffect, useMemo, useState } from "react";
import {
  Database,
  FileStack,
  Users,
  Mail,
  Megaphone,
  Sparkles,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  TrendingUp,
  Layers,
  Link2,
  FileText,
  Youtube,
  ArrowUpRight,
  Activity as ActivityIcon,
  GitBranch,
} from "lucide-react";
import { api, type Stats, type Lead, type KnowledgeItem } from "../../lib/api";
import StatusBadge from "../StatusBadge";
import type { DashboardTab } from "./DashboardSidebar";

type OverviewView = "pipeline" | "knowledge" | "activity";

interface OverviewPanelProps {
  stats: Stats | null;
  onNavigate: (tab: DashboardTab) => void;
}

const VIEWS: { id: OverviewView; label: string; icon: typeof GitBranch }[] = [
  { id: "pipeline", label: "Pipeline", icon: GitBranch },
  { id: "knowledge", label: "Knowledge", icon: Database },
  { id: "activity", label: "Activity", icon: ActivityIcon },
];

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function DonutRing({ value, size = 132 }: { value: number; size?: number }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-surface-overlay"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#donutGradient)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id="donutGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold tabular-nums text-fg">{Math.round(clamped)}%</div>
        <div className="text-xs text-fg-muted">completed</div>
      </div>
    </div>
  );
}

interface MetricDef {
  key: string;
  label: string;
  value: number;
  icon: typeof Database;
  accent: string;
  sub: string;
  progress?: number;
  tab: DashboardTab;
}

export default function OverviewPanel({ stats, onNavigate }: OverviewPanelProps) {
  const [view, setView] = useState<OverviewView>("pipeline");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [l, k] = await Promise.all([api.listLeads(), api.listKnowledge()]);
        if (!active) return;
        setLeads(l.leads);
        setKnowledge(k.items);
      } catch {
        /* backend may be offline; cards still render from stats */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const byStatus = stats?.leadsByStatus ?? {};
  const leadCount = stats?.leadCount ?? 0;
  const completed = byStatus.completed ?? 0;
  const pending = byStatus.pending ?? 0;
  const processing = byStatus.processing ?? 0;
  const failed = byStatus.failed ?? 0;
  const knowledgeCount = stats?.knowledgeCount ?? 0;
  const chunkCount = stats?.chunkCount ?? 0;

  const completionRate = leadCount > 0 ? (completed / leadCount) * 100 : 0;
  const avgChunks = knowledgeCount > 0 ? Math.round(chunkCount / knowledgeCount) : 0;

  const metrics: MetricDef[] = [
    {
      key: "leads",
      label: "Total leads",
      value: leadCount,
      icon: Users,
      accent: "from-brand-500/20 to-brand-600/5 text-brand-300",
      sub: leadCount ? `${pending + processing} in queue` : "Launch a campaign to start",
      tab: "outreach",
    },
    {
      key: "completed",
      label: "Emails generated",
      value: completed,
      icon: Mail,
      accent: "from-emerald-500/20 to-emerald-600/5 text-emerald-300",
      sub: `${Math.round(completionRate)}% completion`,
      progress: completionRate,
      tab: "outreach",
    },
    {
      key: "sources",
      label: "Knowledge sources",
      value: knowledgeCount,
      icon: Database,
      accent: "from-sky-500/20 to-sky-600/5 text-sky-300",
      sub: knowledgeCount ? `${avgChunks} avg chunks / source` : "Add content to ground emails",
      tab: "knowledge",
    },
    {
      key: "chunks",
      label: "Vector chunks",
      value: chunkCount,
      icon: FileStack,
      accent: "from-fuchsia-500/20 to-fuchsia-600/5 text-fuchsia-300",
      sub: "Embedded & searchable",
      tab: "knowledge",
    },
  ];

  const funnel = [
    { label: "Total leads", value: leadCount, icon: Users, color: "bg-brand-500" },
    { label: "Pending", value: pending, icon: Clock, color: "bg-slate-400" },
    { label: "Processing", value: processing, icon: Loader2, color: "bg-amber-400" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "bg-emerald-500" },
    { label: "Failed", value: failed, icon: XCircle, color: "bg-rose-500" },
  ];
  const funnelMax = Math.max(leadCount, 1);

  const recentLeads = useMemo(
    () =>
      [...leads]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 6),
    [leads]
  );

  const recentSources = useMemo(
    () =>
      [...knowledge]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 6),
    [knowledge]
  );

  const sourceTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const k of knowledge) counts[k.source_type] = (counts[k.source_type] ?? 0) + 1;
    return counts;
  }, [knowledge]);

  return (
    <div className="space-y-8">
      {/* Metric cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onNavigate(m.tab)}
              className="card group/metric relative overflow-hidden p-5 text-left transition hover:border-brand-500/40 hover:shadow-glow"
            >
              <div
                className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${m.accent} opacity-60 blur-2xl`}
              />
              <div className="relative flex items-start justify-between">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${m.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-fg-muted opacity-0 transition group-hover/metric:opacity-100" />
              </div>
              <p className="relative mt-4 text-3xl font-bold tabular-nums text-fg">
                {m.value.toLocaleString()}
              </p>
              <p className="relative mt-0.5 text-sm font-medium text-fg-muted">{m.label}</p>
              {m.progress !== undefined ? (
                <div className="relative mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-700"
                      style={{ width: `${Math.max(0, Math.min(100, m.progress))}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-fg-muted">{m.sub}</p>
                </div>
              ) : (
                <p className="relative mt-3 flex items-center gap-1 text-xs text-fg-muted">
                  <TrendingUp className="h-3 w-3" /> {m.sub}
                </p>
              )}
            </button>
          );
        })}
      </section>

      {/* Segmented control + quick actions */}
      <section className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-surface-line bg-ink-800/60 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {VIEWS.map((v) => {
            const Icon = v.icon;
            const isActive = view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{v.label}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate("knowledge")}
            className="btn-ghost justify-center px-3 py-2 text-sm sm:px-4"
          >
            <Database className="h-4 w-4" /> Add knowledge
          </button>
          <button
            type="button"
            onClick={() => onNavigate("outreach")}
            className="btn-primary justify-center px-3 py-2 text-sm sm:px-4"
          >
            <Megaphone className="h-4 w-4" /> Launch campaign
          </button>
        </div>
      </section>

      {/* Views */}
      {view === "pipeline" && (
        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-brand-300" />
              <h2 className="font-semibold text-fg">Lead pipeline</h2>
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              Leads flow from fetch → generate → ready to send.
            </p>
            <div className="mt-6 space-y-4">
              {funnel.map((stage) => {
                const Icon = stage.icon;
                const pct = Math.round((stage.value / funnelMax) * 100);
                return (
                  <div key={stage.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-fg-muted">
                        <Icon className="h-3.5 w-3.5" />
                        {stage.label}
                      </span>
                      <span className="font-semibold tabular-nums text-fg">
                        {stage.value.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-overlay">
                      <div
                        className={`h-full rounded-full ${stage.color} transition-[width] duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card flex flex-col items-center justify-center p-6">
            <h2 className="self-start font-semibold text-fg">Completion rate</h2>
            <p className="mt-1 self-start text-sm text-fg-muted">Generated vs. total leads</p>
            <div className="my-6">
              <DonutRing value={completionRate} />
            </div>
            <div className="grid w-full grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border border-surface-line-subtle bg-ink-900/50 p-3">
                <div className="text-lg font-bold tabular-nums text-emerald-500 dark:text-emerald-300">
                  {completed}
                </div>
                <div className="text-xs text-fg-muted">Completed</div>
              </div>
              <div className="rounded-xl border border-surface-line-subtle bg-ink-900/50 p-3">
                <div className="text-lg font-bold tabular-nums text-fg">{pending + processing}</div>
                <div className="text-xs text-fg-muted">Remaining</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {view === "knowledge" && (
        <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="card p-6">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-300" />
              <h2 className="font-semibold text-fg">Knowledge footprint</h2>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-surface-line-subtle bg-ink-900/50 px-4 py-3">
                <span className="text-sm text-fg-muted">Total sources</span>
                <span className="font-semibold tabular-nums text-fg">{knowledgeCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-surface-line-subtle bg-ink-900/50 px-4 py-3">
                <span className="text-sm text-fg-muted">Vector chunks</span>
                <span className="font-semibold tabular-nums text-fg">{chunkCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-surface-line-subtle bg-ink-900/50 px-4 py-3">
                <span className="text-sm text-fg-muted">Avg chunks / source</span>
                <span className="font-semibold tabular-nums text-fg">{avgChunks}</span>
              </div>
            </div>
            {Object.keys(sourceTypes).length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-fg-muted">
                  By source type
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sourceTypes).map(([type, count]) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1.5 rounded-full border border-surface-line bg-surface-overlay px-3 py-1 text-xs text-fg-body"
                    >
                      {type === "youtube" ? (
                        <Youtube className="h-3.5 w-3.5" />
                      ) : type === "url" ? (
                        <Link2 className="h-3.5 w-3.5" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      {type} · {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-fg">Recent sources</h2>
              <button
                type="button"
                onClick={() => onNavigate("knowledge")}
                className="text-xs font-medium text-brand-400 hover:text-brand-300"
              >
                View all
              </button>
            </div>
            <div className="mt-4">
              {loading ? (
                <div className="grid place-items-center py-10 text-fg-muted">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : recentSources.length === 0 ? (
                <EmptyState
                  icon={Database}
                  title="No knowledge yet"
                  desc="Add URLs or text to build your RAG context."
                />
              ) : (
                <ul className="divide-y divide-surface-line-subtle">
                  {recentSources.map((s) => {
                    const Icon =
                      s.source_type === "youtube" ? Youtube : s.source_type === "url" ? Link2 : FileText;
                    return (
                      <li key={s.id} className="flex items-center gap-3 py-3">
                        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-surface-overlay text-fg-muted">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-fg">{s.title}</p>
                          <p className="text-xs text-fg-muted">
                            {s.chunk_count} chunks · {relativeTime(s.created_at)}
                          </p>
                        </div>
                        <StatusBadge status={s.status} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {view === "activity" && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-300" />
              <h2 className="font-semibold text-fg">Recent leads</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("outreach")}
              className="text-xs font-medium text-brand-400 hover:text-brand-300"
            >
              Open Outreach Matrix
            </button>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="grid place-items-center py-10 text-fg-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : recentLeads.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No leads yet"
                desc="Launch a campaign to populate your outreach matrix."
              />
            ) : (
              <ul className="divide-y divide-surface-line-subtle">
                {recentLeads.map((lead) => {
                  const name = `${lead.first_name} ${lead.last_name}`.trim() || lead.email;
                  return (
                    <li key={lead.id} className="flex items-center gap-3 py-3">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-brand-500/15 text-sm font-semibold text-brand-300">
                        {(name[0] ?? "?").toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{name}</p>
                        <p className="truncate text-xs text-fg-muted">
                          {[lead.job_title, lead.company_name].filter(Boolean).join(" · ") ||
                            lead.email}
                        </p>
                      </div>
                      <span className="hidden text-xs text-fg-muted sm:block">
                        {relativeTime(lead.created_at)}
                      </span>
                      <StatusBadge status={lead.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Database;
  title: string;
  desc: string;
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-surface-line py-12 text-center">
      <Icon className="h-9 w-9 text-fg-muted" />
      <p className="mt-3 font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-fg-muted">{desc}</p>
    </div>
  );
}
