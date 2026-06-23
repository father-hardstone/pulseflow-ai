import { useCallback, useEffect, useState } from "react";
import {
  Users,
  Database,
  Mail,
  Shield,
  LogOut,
  Trash2,
  Loader2,
  Settings,
  LayoutDashboard,
  UserCircle,
  ChevronRight,
} from "lucide-react";
import Logo from "../../components/Logo";
import ThemeToggle from "../../components/ThemeToggle";
import StatusBadge from "../../components/StatusBadge";
import { useAdminAuth } from "../../context/AdminAuthContext";
import {
  adminApi,
  type Admin,
  type AdminKnowledgeItem,
  type AdminLead,
  type PlatformStats,
} from "../../lib/adminApi";
import AdminOverview from "../../components/admin/AdminOverview";
import AdminUsersPanel from "../../components/admin/AdminUsersPanel";
import AdminProfilePanel from "../../components/admin/AdminProfilePanel";
import { formatAdminDate } from "../../components/admin/adminUi";

type Tab = "overview" | "users" | "knowledge" | "leads" | "team" | "profile";

const NAV: { id: Tab; label: string; icon: typeof Users; hint: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, hint: "Platform metrics" },
  { id: "users", label: "Users", icon: Users, hint: "Accounts & outreach stats" },
  { id: "knowledge", label: "Knowledge", icon: Database, hint: "All RAG sources" },
  { id: "leads", label: "Leads", icon: Mail, hint: "Outreach matrix" },
  { id: "team", label: "Admin team", icon: Shield, hint: "Platform admins" },
  { id: "profile", label: "My profile", icon: UserCircle, hint: "Your admin account" },
];

const PAGE: Record<Tab, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Platform health, users, and outreach at a glance." },
  users: { title: "Users", subtitle: "Registered accounts with outreach and knowledge stats." },
  knowledge: { title: "Knowledge base", subtitle: "All ingested sources across workspaces." },
  leads: { title: "Leads", subtitle: "Every outreach lead on the platform." },
  team: { title: "Admin team", subtitle: "Who can access this console." },
  profile: { title: "My profile", subtitle: "Your admin account settings." },
};

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [integrations, setIntegrations] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<Awaited<ReturnType<typeof adminApi.listUsers>>["users"]>([]);
  const [knowledge, setKnowledge] = useState<AdminKnowledgeItem[]>([]);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (tab === "overview") {
        const [s, i] = await Promise.all([adminApi.stats(), adminApi.integrations()]);
        setStats(s.stats);
        setIntegrations(i.configured);
      } else if (tab === "users") {
        const res = await adminApi.listUsers();
        setUsers(res.users);
      } else if (tab === "knowledge") {
        const res = await adminApi.listKnowledge();
        setKnowledge(res.items);
      } else if (tab === "leads") {
        const res = await adminApi.listLeads();
        setLeads(res.leads);
      } else if (tab === "team") {
        const res = await adminApi.listAdmins();
        setAdmins(res.admins);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== "profile") refresh();
  }, [refresh, tab]);

  async function toggleUser(u: (typeof users)[0]) {
    await adminApi.setUserActive(u.id, !u.is_active);
    refresh();
  }

  async function removeUser(id: string) {
    if (!confirm("Delete this user and all their data?")) return;
    await adminApi.deleteUser(id);
    refresh();
  }

  async function removeKnowledge(id: string) {
    if (!confirm("Delete this knowledge item?")) return;
    await adminApi.deleteKnowledge(id);
    refresh();
  }

  async function removeLead(id: string) {
    if (!confirm("Delete this lead?")) return;
    await adminApi.deleteLead(id);
    refresh();
  }

  const meta = PAGE[tab];

  return (
    <div className="flex h-screen overflow-hidden bg-ink-950">
      <aside className="flex w-60 shrink-0 flex-col border-r border-rose-500/15 bg-ink-900/80">
        <div className="border-b border-rose-500/10 px-5 py-5">
          <Logo to="/admin" />
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
            <Shield className="h-3 w-3" />
            Admin console
          </span>
        </div>

        <nav className="scrollbar-slim flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? "bg-rose-600/90 text-white shadow-md shadow-rose-900/30"
                    : "text-fg-muted hover:bg-surface-overlay hover:text-fg"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.label}</span>
                  {!active && (
                    <span className="block truncate text-[10px] opacity-70">{item.hint}</span>
                  )}
                </span>
                {active && <ChevronRight className="h-4 w-4 opacity-70" />}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-rose-500/10 p-4">
          {admin && (
            <div className="mb-3 truncate rounded-lg bg-ink-950/60 px-3 py-2 text-xs">
              <p className="truncate font-medium text-fg">{admin.fullName || admin.email}</p>
              <p className="truncate text-fg-muted">{admin.email}</p>
            </div>
          )}
          <button onClick={logout} className="btn-ghost w-full justify-start text-sm text-rose-300">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-surface-line bg-ink-900/50 px-6 py-4 backdrop-blur">
          <div>
            <h1 className="text-xl font-bold text-fg">{meta.title}</h1>
            <p className="text-sm text-fg-muted">{meta.subtitle}</p>
          </div>
          <ThemeToggle />
        </header>

        <main className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-6">
          {error && (
            <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </p>
          )}

          {loading && tab !== "profile" ? (
            <div className="grid place-items-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-rose-400" />
            </div>
          ) : (
            <>
              {tab === "overview" && stats && (
                <AdminOverview stats={stats} integrations={integrations} />
              )}
              {tab === "users" && (
                <AdminUsersPanel users={users} onToggle={toggleUser} onDelete={removeUser} />
              )}
              {tab === "knowledge" && (
                <div className="card overflow-hidden">
                  <ul className="divide-y divide-white/5">
                    {knowledge.length === 0 ? (
                      <li className="px-6 py-12 text-center text-fg-muted">No knowledge items.</li>
                    ) : (
                      knowledge.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-4 px-6 py-4 hover:bg-surface-overlay/40"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-fg">{item.title}</div>
                            <div className="text-xs text-fg-muted">
                              {item.owner_email} · {item.chunk_count} chunks ·{" "}
                              {formatAdminDate(item.created_at)}
                            </div>
                          </div>
                          <StatusBadge status={item.status as "ready" | "processing" | "failed"} />
                          <button
                            onClick={() => removeKnowledge(item.id)}
                            className="rounded-lg p-2 text-fg-muted hover:bg-rose-500/10 hover:text-rose-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
              {tab === "leads" && (
                <div className="card overflow-hidden">
                  <div className="scrollbar-slim max-h-[calc(100vh-12rem)] overflow-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="sticky top-0 bg-surface-overlay text-xs uppercase text-fg-muted">
                        <tr>
                          <th className="px-6 py-3">Lead</th>
                          <th className="px-4 py-3">Company</th>
                          <th className="px-4 py-3">Owner</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {leads.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-fg-muted">
                              No leads yet.
                            </td>
                          </tr>
                        ) : (
                          leads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-surface-overlay/40">
                              <td className="px-6 py-3">
                                <div className="font-medium text-fg">
                                  {lead.first_name} {lead.last_name}
                                </div>
                                <div className="text-xs text-fg-muted">{lead.email}</div>
                              </td>
                              <td className="px-4 py-3 text-fg-body">{lead.company_name || "—"}</td>
                              <td className="px-4 py-3 text-xs text-fg-muted">{lead.owner_email}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={lead.status as "pending" | "completed" | "failed"} />
                              </td>
                              <td className="px-6 py-3 text-right">
                                <button
                                  onClick={() => removeLead(lead.id)}
                                  className="rounded-lg p-1.5 text-fg-muted hover:bg-rose-500/10 hover:text-rose-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {tab === "team" && (
                <div className="space-y-6">
                  <div className="card overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-surface-overlay text-xs uppercase text-fg-muted">
                        <tr>
                          <th className="px-6 py-3">Admin</th>
                          <th className="px-6 py-3">Role</th>
                          <th className="px-6 py-3">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {admins.map((a) => (
                          <tr key={a.id}>
                            <td className="px-6 py-3">
                              <div className="font-medium text-fg">{a.fullName || a.email}</div>
                              <div className="text-xs text-fg-muted">{a.email}</div>
                            </td>
                            <td className="px-6 py-3 capitalize text-fg-body">{a.role.replace("_", " ")}</td>
                            <td className="px-6 py-3 text-xs text-fg-muted">
                              {formatAdminDate(a.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {admin?.role === "super_admin" && <CreateAdminForm onCreated={refresh} />}
                </div>
              )}
              {tab === "profile" && <AdminProfilePanel />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function CreateAdminForm({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await adminApi.createAdmin({ email, password, fullName, role: "admin" });
      setEmail("");
      setPassword("");
      setFullName("");
      setMsg("Admin created.");
      onCreated();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-rose-400" />
        <h3 className="font-semibold text-fg">Invite admin</h3>
      </div>
      <p className="mt-1 text-xs text-fg-muted">Super admins only.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <input
          className="input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder="Password (10+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="btn-primary mt-4 bg-rose-600 hover:bg-rose-500" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create admin"}
      </button>
      {msg && <p className="mt-2 text-sm text-fg-muted">{msg}</p>}
    </form>
  );
}
