import Reveal from "./Reveal";

const lines = [
  "Subject: Quick idea for Acme's outbound stack",
  "",
  "Hi Sarah —",
  "",
  "I noticed Acme is scaling PLG motion. Your blog on",
  "pipeline velocity maps to how we help teams personalize",
  "at scale with their own content library...",
  "",
  "Open to 10 min Tue 2pm or Thu 11am?",
];

export default function HeroPreview() {
  return (
    <Reveal direction="scale" delay={400} duration={900} className="relative mt-12 w-full lg:mt-0">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-brand-500/20 via-fuchsia-500/10 to-cyan-500/20 blur-2xl" />
      <div className="card relative overflow-hidden border-surface-line shadow-2xl shadow-brand-900/20 dark:shadow-brand-900/40">
        <div className="flex items-center gap-2 border-b border-surface-line bg-ink-900/80 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-xs text-slate-500">Outreach Matrix · Live preview</span>
        </div>
        <div className="grid gap-0 lg:grid-cols-5">
          <div className="border-b border-surface-line-subtle bg-ink-900/50 p-4 lg:col-span-2 lg:border-b-0 lg:border-r">
            <div className="text-xs font-medium uppercase tracking-wider text-fg-muted">Lead</div>
            <div className="mt-2 font-semibold text-fg">Sarah Chen</div>
            <div className="text-sm text-fg-muted">VP Growth · Acme SaaS</div>
            <div className="mt-4 space-y-2">
              {["Context match 0.91", "Gemini Flash", "n8n pipeline"].map((t) => (
                <div
                  key={t}
                  className="rounded-lg border border-brand-400/20 bg-brand-500/10 px-2.5 py-1.5 text-xs text-brand-200"
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div className="p-5 lg:col-span-3">
            <div className="font-mono text-sm leading-relaxed text-fg-body">
              {lines.map((line, i) => (
                <p
                  key={i}
                  className={line ? "opacity-0 animate-fade-up [animation-fill-mode:forwards]" : "h-3"}
                  style={{ animationDelay: `${600 + i * 100}ms` }}
                >
                  {line || "\u00A0"}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-6 -top-6 hidden animate-float rounded-2xl border border-surface-line bg-ink-800/90 px-4 py-3 shadow-xl sm:block">
        <div className="text-xs text-fg-muted">Embeddings</div>
        <div className="text-lg font-bold text-brand-300">384-dim</div>
      </div>
      <div className="absolute -bottom-4 -left-4 hidden animate-float rounded-2xl border border-surface-line bg-ink-800/90 px-4 py-3 shadow-xl sm:block [animation-delay:1.5s]">
        <div className="text-xs text-fg-muted">Personalized</div>
        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-300">100%</div>
      </div>
    </Reveal>
  );
}
