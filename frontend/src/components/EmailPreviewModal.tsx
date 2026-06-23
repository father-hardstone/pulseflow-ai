import { X, Mail, Copy, Check, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { api, type Lead } from "../lib/api";

function bodyParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function EmailPreviewModal({
  lead,
  onClose,
}: {
  lead: Lead | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState("");
  const [sendErr, setSendErr] = useState("");

  if (!lead) return null;

  const fullName = `${lead.first_name} ${lead.last_name}`.trim();
  const body = lead.generated_email || "";
  const subject = lead.generated_subject || "(no subject yet)";
  const paragraphs = bodyParagraphs(body);

  const copy = async () => {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  async function send() {
    if (!lead) return;
    setSending(true);
    setSendMsg("");
    setSendErr("");
    try {
      const res = await api.sendLeadEmail(lead.id);
      if (res.delivery.stubbed) {
        setSendMsg(res.delivery.note || "Demo send skipped (no delivery configured).");
      } else if (res.delivery.channel === "mailtrap") {
        setSendMsg(`Sent to Mailtrap sandbox. ${res.delivery.note || ""}`);
      } else {
        const to = res.delivery.deliveredTo.join(", ");
        setSendMsg(`Sent via Resend to: ${to}`);
      }
    } catch (e) {
      setSendErr((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-surface-scrim p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
              <Mail className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-fg">Email preview</div>
              <div className="text-xs text-slate-400">
                To: {fullName || lead.company_name || "Lead"} &lt;{lead.email}&gt;
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-overlay-hover hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {lead.company_name && (
            <div className="mb-4 text-xs text-fg-muted">
              {[lead.job_title, lead.company_name].filter(Boolean).join(" · ")}
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-surface-line bg-white shadow-sm dark:bg-ink-900/80">
            <div className="h-1 bg-gradient-to-r from-brand-500 to-violet-500" />
            <div className="border-b border-surface-line-subtle px-5 py-4">
              <span className="text-xs uppercase tracking-wide text-fg-muted">Subject</span>
              <div className="mt-1 font-semibold text-fg">{subject}</div>
            </div>
            <div className="space-y-4 px-5 py-5">
              {paragraphs.length > 0 ? (
                paragraphs.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {p}
                  </p>
                ))
              ) : (
                <p className="text-sm text-fg-muted">This lead hasn&apos;t been generated yet.</p>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-fg-muted">
            Demo send uses Settings → Demo email.
          </p>
        </div>

        {(sendMsg || sendErr) && (
          <div className="border-t border-surface-line-subtle px-6 py-3 text-sm">
            {sendMsg && <p className="text-emerald-500 dark:text-emerald-300">{sendMsg}</p>}
            {sendErr && <p className="text-rose-500 dark:text-rose-400">{sendErr}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-surface-line px-6 py-4">
          <button onClick={onClose} className="btn-ghost">Close</button>
          <button onClick={copy} className="btn-ghost" disabled={!body}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={send} className="btn-primary" disabled={!body || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : "Send demo email"}
          </button>
        </div>
      </div>
    </div>
  );
}
