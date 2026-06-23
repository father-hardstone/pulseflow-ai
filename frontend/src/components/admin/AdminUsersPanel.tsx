import { Trash2, UserX, UserCheck } from "lucide-react";
import type { AdminUser } from "../../lib/adminApi";
import StatusBadge from "../StatusBadge";
import { formatAdminDate } from "./adminUi";

export default function AdminUsersPanel({
  users,
  onToggle,
  onDelete,
}: {
  users: AdminUser[];
  onToggle: (u: AdminUser) => void;
  onDelete: (id: string) => void;
}) {
  if (!users.length) {
    return (
      <div className="card grid place-items-center px-6 py-16 text-center text-fg-muted">
        No users registered yet.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-surface-line px-6 py-4">
        <h3 className="font-semibold text-fg">User accounts</h3>
        <p className="mt-0.5 text-xs text-fg-muted">
          Outreach runs, knowledge sources, and account status per user.
        </p>
      </div>
      <div className="scrollbar-slim max-h-[calc(100vh-14rem)] overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-surface-overlay text-xs uppercase tracking-wide text-fg-muted">
            <tr>
              <th className="px-6 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Outreach</th>
              <th className="px-4 py-3 font-medium">Knowledge</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-6 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-surface-overlay/50">
                <td className="px-6 py-3">
                  <div className="font-medium text-fg">{u.full_name || "—"}</div>
                  <div className="text-xs text-fg-muted">{u.email}</div>
                  {u.llm_provider && (
                    <div className="mt-0.5 text-[10px] uppercase tracking-wide text-fg-muted">
                      LLM: {u.llm_provider}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium tabular-nums text-fg">
                    {u.stats?.outreachRuns ?? 0} runs
                  </div>
                  <div className="text-xs text-fg-muted">
                    {u.stats?.leadsCompleted ?? 0} done · {u.stats?.leadsPending ?? 0} pending
                    {(u.stats?.leadsFailed ?? 0) > 0 && (
                      <span className="text-rose-400"> · {u.stats?.leadsFailed} failed</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-fg-body">
                  {u.stats?.knowledgeCount ?? 0} sources
                </td>
                <td className="px-4 py-3 text-xs text-fg-muted">{formatAdminDate(u.created_at)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={u.is_active ? "ready" : "failed"} />
                </td>
                <td className="px-6 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => onToggle(u)}
                      className="rounded-lg p-2 text-fg-muted hover:bg-surface-overlay hover:text-fg"
                      title={u.is_active ? "Disable user" : "Enable user"}
                    >
                      {u.is_active ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(u.id)}
                      className="rounded-lg p-2 text-fg-muted hover:bg-rose-500/10 hover:text-rose-400"
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
