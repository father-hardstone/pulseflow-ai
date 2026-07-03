import { useState, useEffect } from "react";
import {
  User as UserIcon,
  CreditCard,
  Shield,
  Calendar,
  Check,
  Loader2,
  Sparkles,
  Zap,
  Rocket,
  Download,
  Lock,
  Database,
  Brain,
  Workflow,
  AlertCircle,
  CheckCircle2,
  Mail,
  Send,
} from "lucide-react";
import type { HealthConfigured, User } from "../../lib/api";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import DemoEmailSettings from "./DemoEmailSettings";

type SettingsTab = "profile" | "demo-email" | "subscription" | "security";

interface SettingsPanelProps {
  user: User | null;
  health?: HealthConfigured | null;
}

const TABS: { id: SettingsTab; label: string; icon: typeof UserIcon }[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "demo-email", label: "Demo email", icon: Mail },
  { id: "subscription", label: "Subscription", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function SettingsPanel({ user, health }: SettingsPanelProps) {
  const [tab, setTab] = useState<SettingsTab>("profile");

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="inline-flex shrink-0 flex-wrap gap-1 rounded-lg border border-surface-line bg-ink-800/60 p-0.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                isActive ? "bg-brand-600 text-white shadow-sm" : "text-fg-muted hover:text-fg"
              }`}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {tab === "profile" && <ProfileSettings user={user} health={health} />}
        {tab === "demo-email" && (
          <div className="scrollbar-slim lg:h-full lg:overflow-y-auto lg:pr-1">
            <DemoEmailSettings />
          </div>
        )}
        {tab === "subscription" && (
          <div className="scrollbar-slim lg:h-full lg:overflow-y-auto lg:pr-1">
            <SubscriptionSettings />
          </div>
        )}
        {tab === "security" && (
          <div className="scrollbar-slim lg:h-full lg:overflow-y-auto lg:pr-1">
            <SecuritySettings />
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileSettings({
  user,
  health,
}: {
  user: User | null;
  health?: HealthConfigured | null;
}) {
  const { setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const initial = (user?.fullName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError("");
    try {
      const res = await api.updateProfile({ fullName });
      setUser(res.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid w-full gap-5 lg:grid-cols-2 lg:items-start">
      {/* Account */}
      <div className="card flex flex-col gap-6 p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xl font-bold text-white shadow-glow">
            {initial}
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-fg">
                {user?.fullName || "Your account"}
              </h3>
              <span className="badge border border-brand-400/30 bg-brand-500/10 text-brand-300 dark:text-brand-200">
                Starter plan
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm text-fg-muted">{user?.email}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-muted">
              <Calendar className="h-3.5 w-3.5" />
              Member since {formatDate(user?.createdAt ?? null)}
            </p>
          </div>
        </div>

        <form onSubmit={save} className="space-y-4 border-t border-surface-line-subtle pt-5">
          <div>
            <h4 className="text-sm font-semibold text-fg">Profile details</h4>
            <p className="mt-0.5 text-xs text-fg-muted">How your name appears across the workspace.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input opacity-70" value={user?.email ?? ""} disabled />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save changes
            </button>
            {saved && <span className="text-sm text-emerald-500 dark:text-emerald-300">Saved</span>}
            {saveError && <span className="text-sm text-rose-500 dark:text-rose-400">{saveError}</span>}
          </div>
        </form>
      </div>

      {/* Workspace */}
      <IntegrationsPanel user={user} health={health} />
    </div>
  );
}

type LlmProvider = "gemini" | "groq";

function IntegrationsPanel({
  user,
  health,
}: {
  user: User | null;
  health?: HealthConfigured | null;
}) {
  const { setUser } = useAuth();
  const [llmProvider, setLlmProvider] = useState<LlmProvider>(user?.llmProvider ?? "gemini");
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");

  const geminiReady = health?.llmProviders?.gemini?.configured ?? false;
  const groqReady = health?.llmProviders?.groq?.configured ?? false;

  useEffect(() => {
    if (user?.llmProvider) setLlmProvider(user.llmProvider);
  }, [user?.llmProvider]);

  async function selectProvider(next: LlmProvider) {
    if (next === llmProvider || switching) return;
    const ready = next === "gemini" ? geminiReady : groqReady;
    if (!ready) {
      setSwitchError(
        next === "gemini"
          ? "Gemini isn't set up yet. Add GEMINI_API_KEY on the server."
          : "Groq isn't set up yet. Add GROQ_API_KEY on the server."
      );
      return;
    }
    setSwitching(true);
    setSwitchError("");
    try {
      const res = await api.updateProfile({ llmProvider: next });
      setUser(res.user);
      setLlmProvider(next);
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : "Could not switch provider.");
    } finally {
      setSwitching(false);
    }
  }

  const services = health
    ? [
        {
          id: "database",
          label: "Database",
          hint: "Knowledge, leads & emails",
          ready: health.supabase,
          icon: Database,
        },
        {
          id: "embeddings",
          label: "Smart search",
          hint: "Vector context retrieval",
          ready: health.embeddings,
          icon: Brain,
        },
        {
          id: "email-ai",
          label: "Email AI",
          hint: "Outreach generation",
          ready: geminiReady || groqReady,
          icon: Sparkles,
        },
        {
          id: "automation",
          label: "Automation",
          hint: "Apollo + n8n campaigns",
          ready: health.apolloApi?.accessible && health.n8nWebhook?.live,
          optional: true,
          icon: Workflow,
        },
        {
          id: "mailtrap",
          label: "Mailtrap",
          hint: "Sandbox inbox",
          ready: health.mailtrap ?? false,
          optional: true,
          icon: Mail,
        },
        {
          id: "resend",
          label: "Resend",
          hint: "Test delivery",
          ready: health.resend ?? false,
          optional: true,
          icon: Send,
        },
      ]
    : [];

  const coreReady = health?.supabase && health?.embeddings && (geminiReady || groqReady);
  const activeModel =
    llmProvider === "groq"
      ? health?.llmProviders?.groq?.model ?? "llama-3.3-70b-versatile"
      : health?.llmProviders?.gemini?.model ?? "gemini-1.5-flash";

  return (
    <div className="card flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">Workspace & integrations</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            Connection status and AI engine for outreach.
          </p>
        </div>
        {!health ? (
          <span className="flex items-center gap-2 text-xs text-fg-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              coreReady
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            }`}
          >
            {coreReady ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {coreReady ? "Ready to generate" : "Setup incomplete"}
          </span>
        )}
      </div>

      {!health ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-surface-line py-12 text-sm text-fg-muted">
          Loading connection status…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {services.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.id}
                  className="flex items-start gap-3 rounded-xl border border-surface-line-subtle bg-ink-900/40 p-4"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      svc.ready
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                        : "bg-surface-overlay text-fg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-fg">{svc.label}</p>
                      {svc.optional && (
                        <span className="text-[10px] uppercase tracking-wide text-fg-muted">Optional</span>
                      )}
                    </div>
                    <p className="text-xs text-fg-muted">{svc.hint}</p>
                    <p className={`mt-1.5 text-xs font-medium ${svc.ready ? "text-emerald-600 dark:text-emerald-300" : "text-fg-muted"}`}>
                      {svc.ready ? "Connected" : "Not configured"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-surface-line-subtle bg-ink-900/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-fg">Email AI engine</p>
                <p className="text-xs text-fg-muted">Model used when generating outreach</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-lg border border-surface-line bg-ink-800/80 p-1">
                  <LlmSegment
                    label="Gemini"
                    selected={llmProvider === "gemini"}
                    ready={geminiReady}
                    busy={switching}
                    onSelect={() => selectProvider("gemini")}
                  />
                  <LlmSegment
                    label="Groq"
                    selected={llmProvider === "groq"}
                    ready={groqReady}
                    busy={switching}
                    onSelect={() => selectProvider("groq")}
                  />
                </div>
                <span className="rounded-md bg-surface-overlay px-2.5 py-1 font-mono text-xs text-fg-muted">
                  {activeModel}
                </span>
                {switching && <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />}
              </div>
            </div>
            {switchError && (
              <p className="mt-3 text-xs text-rose-500 dark:text-rose-400">{switchError}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LlmSegment({
  label,
  selected,
  ready,
  busy,
  onSelect,
}: {
  label: string;
  selected: boolean;
  ready: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!ready || busy}
      onClick={onSelect}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
        selected
          ? "bg-brand-600 text-white shadow-sm"
          : ready
            ? "text-fg-muted hover:text-fg"
            : "cursor-not-allowed text-fg-muted/50"
      }`}
      aria-pressed={selected}
      title={!ready ? `${label} API key not configured` : undefined}
    >
      {label}
    </button>
  );
}

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  icon: typeof Zap;
  features: string[];
  current?: boolean;
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$0",
    period: "/mo",
    icon: Sparkles,
    features: ["100 leads / mo", "3 knowledge sources", "Gemini Flash", "Community support"],
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    period: "/mo",
    icon: Zap,
    features: ["2,500 leads / mo", "Unlimited sources", "Priority generation", "n8n + Apollo", "Email support"],
    highlight: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: "$199",
    period: "/mo",
    icon: Rocket,
    features: ["25,000 leads / mo", "Dedicated workers", "Custom models", "SSO & roles", "Priority support"],
  },
];

const INVOICES = [
  { id: "INV-2026-006", date: "Jun 1, 2026", amount: "$0.00", status: "Paid" },
  { id: "INV-2026-005", date: "May 1, 2026", amount: "$0.00", status: "Paid" },
  { id: "INV-2026-004", date: "Apr 1, 2026", amount: "$0.00", status: "Paid" },
];

function SubscriptionSettings() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      <div className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">Current plan</p>
            <div className="mt-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-300" />
              <h3 className="text-2xl font-bold text-fg">Starter</h3>
              <span className="badge border border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                Active
              </span>
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              Free forever · Renews automatically · No card required
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tabular-nums text-fg">
              $0<span className="text-base font-normal text-fg-muted">/mo</span>
            </div>
          </div>
        </div>

        {/* Usage meters */}
        <div className="relative mt-6 grid gap-4 sm:grid-cols-2">
          <UsageMeter label="Leads this month" used={42} quota={100} />
          <UsageMeter label="Knowledge sources" used={2} quota={3} />
        </div>
      </div>

      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm ${billing === "monthly" ? "text-fg" : "text-fg-muted"}`}>Monthly</span>
        <button
          type="button"
          onClick={() => setBilling((b) => (b === "monthly" ? "annual" : "monthly"))}
          className="relative h-6 w-11 rounded-full bg-surface-overlay transition"
          aria-label="Toggle billing cycle"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-brand-500 transition-all ${
              billing === "annual" ? "left-[1.375rem]" : "left-0.5"
            }`}
          />
        </button>
        <span className={`text-sm ${billing === "annual" ? "text-fg" : "text-fg-muted"}`}>
          Annual <span className="text-emerald-500 dark:text-emerald-300">−20%</span>
        </span>
      </div>

      {/* Plans */}
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`card relative flex flex-col p-6 ${
                plan.highlight ? "border-brand-500/50 shadow-glow" : ""
              }`}
            >
              {plan.highlight && (
                <span className="badge absolute -top-3 left-6 bg-brand-500 text-white">
                  Most popular
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
                  <Icon className="h-4 w-4" />
                </span>
                <h4 className="font-semibold text-fg">{plan.name}</h4>
              </div>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-3xl font-bold text-fg">{plan.price}</span>
                <span className="pb-1 text-sm text-fg-muted">{plan.period}</span>
              </div>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-fg-body">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-emerald-500 dark:text-emerald-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={plan.current}
                className={`mt-5 w-full ${plan.current ? "btn-ghost" : "btn-primary"}`}
              >
                {plan.current ? "Current plan" : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment method + invoices */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-semibold text-fg">Payment method</h3>
          <p className="mt-1 text-sm text-fg-muted">Add a card to upgrade to a paid plan.</p>
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-surface-line bg-ink-900/40 px-4 py-4">
            <span className="grid h-10 w-12 place-items-center rounded-md bg-surface-overlay text-fg-muted">
              <CreditCard className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-fg">No payment method</p>
              <p className="text-xs text-fg-muted">You're on the free plan</p>
            </div>
            <button type="button" className="btn-ghost px-3 py-2 text-sm">
              Add card
            </button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-muted">
            <Lock className="h-3 w-3" /> Payments are securely processed. Billing is in demo mode.
          </p>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-fg">Billing history</h3>
          <p className="mt-1 text-sm text-fg-muted">Download past invoices.</p>
          <ul className="mt-4 divide-y divide-surface-line-subtle">
            {INVOICES.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{inv.id}</p>
                  <p className="text-xs text-fg-muted">{inv.date}</p>
                </div>
                <span className="text-sm tabular-nums text-fg-body">{inv.amount}</span>
                <span className="badge border border-emerald-400/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  {inv.status}
                </span>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-fg-muted transition hover:bg-surface-overlay-hover hover:text-fg"
                  title="Download invoice"
                >
                  <Download className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function UsageMeter({ label, used, quota }: { label: string; used: number; quota: number }) {
  const pct = Math.min(100, Math.round((used / quota) * 100));
  const near = pct >= 80;
  return (
    <div className="rounded-xl border border-surface-line-subtle bg-ink-900/50 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-fg-muted">{label}</span>
        <span className="font-medium tabular-nums text-fg">
          {used} / {quota}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-overlay">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${
            near ? "bg-amber-500" : "bg-gradient-to-r from-brand-400 to-brand-600"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SecuritySettings() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    if (next.length < 8) {
      setErr("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setErr("Passwords don't match.");
      return;
    }
    setSaving(true);
    // No password-change endpoint yet; simulate.
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    setMsg("Password updated.");
    setTimeout(() => setMsg(""), 2500);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} className="card p-6">
        <h3 className="font-semibold text-fg">Change password</h3>
        <p className="mt-1 text-sm text-fg-muted">Use a strong, unique password.</p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              className="input"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              className="input"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-rose-500 dark:text-rose-400">{err}</p>}
        {msg && <p className="mt-3 text-sm text-emerald-500 dark:text-emerald-300">{msg}</p>}
        <button type="submit" className="btn-primary mt-5" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          Update password
        </button>
      </form>

      <div className="card h-fit p-6">
        <h3 className="font-semibold text-fg">Sessions</h3>
        <p className="mt-1 text-sm text-fg-muted">You're signed in on this device.</p>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-surface-line-subtle bg-ink-900/50 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-500 dark:text-emerald-300">
            <Check className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-fg">This device</p>
            <p className="text-xs text-fg-muted">Active now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
