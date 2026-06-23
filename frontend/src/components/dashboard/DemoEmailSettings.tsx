import { useCallback, useEffect, useState } from "react";
import {
  Inbox,
  Send,
  Plus,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { api, type DemoEmailRecipient, type DemoEmailTarget } from "../../lib/api";

export default function DemoEmailSettings() {
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<DemoEmailTarget>("mailtrap");
  const [recipients, setRecipients] = useState<DemoEmailRecipient[]>([]);
  const [maxRecipients, setMaxRecipients] = useState(4);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [draft, setDraft] = useState({ firstName: "", lastName: "", email: "" });
  const [adding, setAdding] = useState(false);

  const isReal = target === "real";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getDemoEmail();
      setTarget(res.target);
      setRecipients(res.recipients);
      setMaxRecipients(res.maxRecipients);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleMode() {
    const next: DemoEmailTarget = isReal ? "mailtrap" : "real";
    if (switching) return;
    setSwitching(true);
    setError("");
    setNotice("");
    try {
      const res = await api.updateDemoEmailTarget(next);
      setTarget(res.target);
      setRecipients(res.recipients);
      setNotice(next === "mailtrap" ? "Mailtrap sandbox enabled." : "Real test mode enabled.");
      setTimeout(() => setNotice(""), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSwitching(false);
    }
  }

  async function addRecipient(e: React.FormEvent) {
    e.preventDefault();
    if (recipients.length >= maxRecipients) return;
    setAdding(true);
    setError("");
    try {
      const res = await api.addDemoRecipient(draft);
      setRecipients((prev) => [...prev, res.recipient]);
      setDraft({ firstName: "", lastName: "", email: "" });
      setNotice("Recipient added.");
      setTimeout(() => setNotice(""), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function removeRecipient(id: string) {
    setError("");
    try {
      await api.deleteDemoRecipient(id);
      setRecipients((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-fg-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="card relative overflow-hidden p-6">
        <div className="relative flex flex-wrap items-start gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/15 text-brand-300">
            {isReal ? <Send className="h-5 w-5" /> : <Inbox className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-fg">Demo email delivery</h3>
            <p className="mt-1 text-sm text-fg-muted">
              Choose where generated outreach emails are sent for preview and testing.
            </p>
          </div>
        </div>

        <div className="relative mt-6 rounded-xl border border-surface-line-subtle bg-ink-900/50 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-sm font-medium ${!isReal ? "text-fg" : "text-fg-muted"}`}>
              Mailtrap
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isReal}
              aria-label="Toggle delivery target"
              disabled={switching}
              onClick={toggleMode}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                isReal ? "bg-brand-500" : "bg-surface-overlay"
              } ${switching ? "opacity-60" : ""}`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                  isReal ? "left-[1.375rem]" : "left-0.5"
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isReal ? "text-fg" : "text-fg-muted"}`}>
              Real test addresses
            </span>
            {switching && <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />}
          </div>
        </div>

        {(notice || error) && (
          <div className="relative mt-4">
            {notice && (
              <p className="flex items-center gap-2 text-sm text-emerald-500 dark:text-emerald-300">
                <Check className="h-4 w-4 shrink-0" /> {notice}
              </p>
            )}
            {error && (
              <p className="flex items-center gap-2 text-sm text-rose-500 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              </p>
            )}
          </div>
        )}
      </div>

      {isReal && (
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-semibold text-fg">Test recipients</h4>
              <p className="mt-0.5 text-xs text-fg-muted">Up to {maxRecipients} addresses via Resend.</p>
            </div>
            <span className="rounded-full bg-surface-overlay px-2.5 py-1 text-xs font-medium text-fg-muted">
              {recipients.length} / {maxRecipients}
            </span>
          </div>

          {recipients.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-surface-line-subtle">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-overlay text-xs uppercase tracking-wide text-fg-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">First name</th>
                    <th className="px-4 py-3 font-medium">Last name</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="w-12 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-line-subtle">
                  {recipients.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-overlay/40">
                      <td className="px-4 py-3 text-fg">{r.firstName || "—"}</td>
                      <td className="px-4 py-3 text-fg">{r.lastName || "—"}</td>
                      <td className="px-4 py-3 text-fg-muted">{r.email}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeRecipient(r.id)}
                          className="rounded-lg p-1.5 text-fg-muted hover:bg-rose-500/10 hover:text-rose-400"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-surface-line bg-ink-900/30 px-4 py-6 text-center text-sm text-fg-muted">
              No recipients yet. Add addresses below.
            </p>
          )}

          {recipients.length < maxRecipients && (
            <form
              onSubmit={addRecipient}
              className="mt-4 grid gap-3 border-t border-surface-line-subtle pt-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_auto]"
            >
              <div>
                <label className="label">First name</label>
                <input
                  className="input"
                  value={draft.firstName}
                  onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="label">Last name</label>
                <input
                  className="input"
                  value={draft.lastName}
                  onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={draft.email}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  placeholder="jane@yourcompany.com"
                />
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <button type="submit" className="btn-primary w-full sm:w-auto" disabled={adding}>
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
