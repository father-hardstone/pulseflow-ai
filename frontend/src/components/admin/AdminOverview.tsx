import {
  Users,
  UserCheck,
  UserPlus,
  Megaphone,
  Database,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { PlatformStats } from "../../lib/adminApi";
import { AdminStatCard } from "./adminUi";

export default function AdminOverview({
  stats,
  integrations,
}: {
  stats: PlatformStats;
  integrations: Record<string, unknown> | null;
}) {
  const leadTotal = stats.leadCount || 1;
  const completedPct = Math.round(((stats.leadsCompleted || 0) / leadTotal) * 100);

  const integrationEntries = integrations
    ? Object.entries(integrations).filter(([k]) => typeof integrations[k] === "boolean")
    : [];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/40 via-ink-900 to-ink-900 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-rose-500/15 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-300/80">
            Platform pulse
          </p>
          <h2 className="mt-1 text-2xl font-bold text-fg sm:text-3xl">
            {stats.activeUserCount} active users
          </h2>
          <p className="mt-2 max-w-xl text-sm text-fg-muted">
            {stats.userCount} registered · {stats.newUsersThisMonth} joined this month ·{" "}
            {stats.usersWithOutreach} ran outreach · {stats.usersWithKnowledge} built knowledge bases
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Registered users"
          value={stats.userCount}
          hint={`${stats.activeUserCount} active · ${stats.inactiveUserCount} disabled`}
          icon={Users}
          accent="rose"
        />
        <AdminStatCard
          label="Outreach runs"
          value={stats.outreachRuns}
          hint={`${stats.usersWithOutreach} users with leads`}
          icon={Megaphone}
          accent="violet"
        />
        <AdminStatCard
          label="Emails generated"
          value={stats.leadsCompleted}
          hint={`${completedPct}% completion rate`}
          icon={CheckCircle2}
          accent="emerald"
        />
        <AdminStatCard
          label="Knowledge sources"
          value={stats.knowledgeCount}
          hint={`${stats.chunkCount} vector chunks`}
          icon={Database}
          accent="sky"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <h3 className="font-semibold text-fg">Outreach pipeline</h3>
          </div>
          <div className="mt-5 space-y-4">
            {[
              { label: "Completed", value: stats.leadsCompleted, color: "bg-emerald-500" },
              { label: "Pending / processing", value: stats.leadsPending, color: "bg-amber-500" },
              { label: "Failed", value: stats.leadsFailed, color: "bg-rose-500" },
            ].map((row) => {
              const pct = leadTotal > 0 ? Math.round((row.value / leadTotal) * 100) : 0;
              return (
                <div key={row.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">{row.label}</span>
                    <span className="font-medium tabular-nums text-fg">
                      {row.value} <span className="text-fg-muted">({pct}%)</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-overlay">
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-rose-400" />
            <h3 className="font-semibold text-fg">User activity</h3>
          </div>
          <ul className="mt-5 space-y-3">
            {[
              {
                icon: UserCheck,
                label: "Active accounts",
                value: stats.activeUserCount,
              },
              {
                icon: Megaphone,
                label: "Users with outreach",
                value: stats.usersWithOutreach,
              },
              {
                icon: Database,
                label: "Users with knowledge",
                value: stats.usersWithKnowledge,
              },
              {
                icon: Users,
                label: "Platform admins",
                value: stats.adminCount,
              },
            ].map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between rounded-lg border border-surface-line-subtle bg-ink-900/40 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <row.icon className="h-4 w-4 text-fg-muted" />
                  <span className="text-sm text-fg-body">{row.label}</span>
                </div>
                <span className="text-lg font-semibold tabular-nums text-fg">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {integrationEntries.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h3 className="font-semibold text-fg">Integrations</h3>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {integrationEntries.map(([key, ok]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-surface-line-subtle bg-ink-900/50 px-3 py-2.5 text-sm"
              >
                <span className="capitalize text-fg-muted">{key.replace(/([A-Z])/g, " $1")}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    ok
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {ok ? "OK" : "Off"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
