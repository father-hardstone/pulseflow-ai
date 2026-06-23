import { Link } from "react-router-dom";
import {
  ArrowRight,
  Database,
  Workflow,
  Sparkles,
  Send,
  Check,
  Github,
  BrainCircuit,
  LineChart,
  Zap,
  ChevronRight,
  Layers,
  Shield,
} from "lucide-react";
import Logo from "../components/Logo";
import LandingNav from "../components/landing/LandingNav";
import HeroBackground from "../components/landing/HeroBackground";
import HeroPreview from "../components/landing/HeroPreview";
import Reveal, { Stagger } from "../components/landing/Reveal";
import { SectionGlow } from "../components/landing/HeroBackground";

const steps = [
  {
    icon: Database,
    step: "01",
    title: "Build your Knowledge Base",
    desc: "Drop in blogs, docs, or YouTube links. We chunk and vectorize them into a semantic context library with pgvector.",
  },
  {
    icon: Workflow,
    step: "02",
    title: "Fetch leads with n8n + Apollo",
    desc: "Launch a campaign and our automation engine pulls targeted prospects from Apollo using your filters.",
  },
  {
    icon: Sparkles,
    step: "03",
    title: "Generate hyper-personalized copy",
    desc: "LangChain retrieves your most relevant content and Gemini Flash writes a custom email for every lead.",
  },
  {
    icon: Send,
    step: "04",
    title: "Push to your tools",
    desc: "Review in the Outreach Matrix, then sync drafts to Gmail, HubSpot, or Slack — no copy-paste.",
  },
];

const integrations = [
  { name: "Apollo.io", tag: "Leads", color: "from-violet-500/20 to-violet-600/5" },
  { name: "n8n", tag: "Automation", color: "from-rose-500/20 to-rose-600/5" },
  { name: "Gemini Flash", tag: "LLM", color: "from-amber-500/20 to-amber-600/5" },
  { name: "Supabase", tag: "DB + pgvector", color: "from-emerald-500/20 to-emerald-600/5" },
  { name: "HuggingFace", tag: "Embeddings", color: "from-yellow-500/20 to-yellow-600/5" },
  { name: "Gmail / HubSpot", tag: "Delivery", color: "from-sky-500/20 to-sky-600/5" },
];

const tiers = [
  {
    name: "Starter",
    price: "$0",
    period: "/mo",
    blurb: "For solo founders testing the waters.",
    features: ["1 knowledge base", "100 leads / mo", "Gemini Flash generation", "Supabase pgvector"],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$49",
    period: "/mo",
    blurb: "For teams scaling outbound.",
    features: [
      "Unlimited knowledge bases",
      "5,000 leads / mo",
      "Apollo + n8n automation",
      "Supabase pgvector",
      "Gmail & HubSpot sync",
    ],
    cta: "Start 14-day trial",
    highlight: true,
  },
  {
    name: "Scale",
    price: "Custom",
    period: "",
    blurb: "For agencies and high-volume senders.",
    features: ["Unlimited leads", "Priority queue", "Dedicated workflows", "SSO & support SLA"],
    cta: "Contact sales",
    highlight: false,
  },
];

const stats = [
  { icon: BrainCircuit, value: "384-dim", label: "Vector embeddings" },
  { icon: Zap, value: "15 RPM", label: "Gemini Flash free tier" },
  { icon: LineChart, value: "100%", label: "Personalized at scale" },
];

const marqueeItems = [
  "RAG-powered outreach",
  "Apollo lead sync",
  "n8n orchestration",
  "LangChain + Gemini",
  "pgvector search",
  "Hyper-personalized copy",
];

function SectionHead({
  label,
  title,
  desc,
}: {
  label: string;
  title: string;
  desc: string;
}) {
  return (
    <Reveal className="max-w-2xl">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">
        {label}
      </span>
      <h2 className="mt-3 text-3xl font-bold text-fg sm:text-4xl lg:text-5xl">{title}</h2>
      <p className="mt-4 text-lg text-slate-400">{desc}</p>
    </Reveal>
  );
}

function MarqueeStrip() {
  const items = [...marqueeItems, ...marqueeItems];
  return (
    <div className="relative w-full overflow-hidden border-y border-surface-line-subtle bg-ink-800/40 py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink-900 to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink-900 to-transparent sm:w-24" />
      <div className="flex animate-marquee whitespace-nowrap">
        {items.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="mx-8 inline-flex items-center gap-2 text-sm font-medium text-slate-400"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-400" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-900">
      <LandingNav />

      {/* Hero — split layout on large screens */}
      <section className="relative pt-28 sm:pt-36">
        <HeroBackground />
        <div className="container-wide pb-16 sm:pb-20">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10 xl:gap-16">
            <div className="text-left">
              <Reveal direction="down" delay={0}>
                <span className="badge border border-brand-400/30 bg-brand-500/10 text-brand-200">
                  <Sparkles className="h-3.5 w-3.5" /> Content-driven outreach
                </span>
              </Reveal>

              <Reveal direction="up" delay={80}>
                <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-fg sm:text-5xl xl:text-6xl">
                  Turn your content into{" "}
                  <span className="text-gradient-animated">cold emails that convert</span>
                </h1>
              </Reveal>

              <Reveal direction="up" delay={160}>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
                  Vectorize blogs, docs, and videos. Fetch leads from Apollo via n8n. LangChain +
                  Gemini writes hyper-personalized outreach for every prospect.
                </p>
              </Reveal>

              <Reveal direction="up" delay={240}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link to="/signup" className="btn-primary group px-7 py-3 text-base">
                    Launch your first campaign
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
                  <a href="#how" className="btn-ghost group px-7 py-3 text-base">
                    How it works
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </a>
                </div>
              </Reveal>

              <Stagger
                className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3"
                staggerMs={80}
              >
                {stats.map((s) => (
                  <div key={s.label} className="landing-card-hover card group p-4">
                    <s.icon className="h-5 w-5 text-brand-400" />
                    <div className="mt-2 text-xl font-bold text-fg">{s.value}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </Stagger>
            </div>

            <HeroPreview />
          </div>
        </div>
      </section>

      <MarqueeStrip />

      {/* How it works */}
      <section id="how" className="relative py-20 sm:py-28">
        <SectionGlow className="left-1/4 top-0" />
        <div className="container-wide">
          <SectionHead
            label="Pipeline"
            title="How it works"
            desc="From raw content to a ready-to-send inbox in four automated steps."
          />

          <div className="relative mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-14 hidden h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent xl:block" />
            {steps.map((step, i) => (
              <Reveal key={step.title} direction="up" delay={i * 80}>
                <div className="landing-card-hover card group relative h-full p-6">
                  <span className="absolute right-4 top-4 font-mono text-xs text-brand-400/50">
                    {step.step}
                  </span>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/15">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-fg">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations — full-width card */}
      <section id="integrations" className="py-20 sm:py-28">
        <div className="container-wide">
          <Reveal direction="up">
            <div className="card relative overflow-hidden border-surface-line p-8 sm:p-10 lg:p-12">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.12),transparent_55%)]" />
              <div className="relative grid items-start gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
                <div>
                  <div className="flex items-center gap-2 text-brand-300">
                    <Layers className="h-5 w-5" />
                    <span className="text-sm font-medium uppercase tracking-wider">
                      Integrations
                    </span>
                  </div>
                  <h2 className="mt-4 text-3xl font-bold text-fg sm:text-4xl">
                    Plugs into your stack
                  </h2>
                  <p className="mt-4 max-w-lg text-slate-400 leading-relaxed">
                    n8n orchestrates Apollo, Gemini, and delivery tools. Supabase stores vectors.
                    HuggingFace embeds your content. One pipeline, zero glue code.
                  </p>
                  <Link to="/signup" className="btn-primary group mt-8">
                    Try it now
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </Link>
                </div>

                <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3" staggerMs={60}>
                  {integrations.map((it) => (
                    <div
                      key={it.name}
                      className={`landing-card-hover rounded-xl border border-surface-line bg-gradient-to-br ${it.color} p-4`}
                    >
                      <div className="font-semibold text-fg">{it.name}</div>
                      <div className="mt-1 text-xs text-brand-300">{it.tag}</div>
                    </div>
                  ))}
                </Stagger>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Trust strip — edge to edge content */}
      <section className="border-y border-surface-line-subtle py-14">
        <div className="container-wide">
          <Stagger className="grid gap-8 sm:grid-cols-3" staggerMs={100}>
            {[
              { icon: Shield, title: "JWT auth", desc: "Separate user & admin sessions" },
              { icon: Database, title: "Supabase + pgvector", desc: "384-dim semantic search" },
              { icon: Workflow, title: "n8n spine", desc: "Campaign orchestration built-in" },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-surface-overlay text-brand-300">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-semibold text-fg">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.desc}</div>
                </div>
              </div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-20 sm:py-28">
        <SectionGlow className="right-0 top-1/4" />
        <div className="container-wide">
          <SectionHead
            label="Pricing"
            title="Simple, transparent"
            desc="Start on a free stack. Upgrade when you scale outbound."
          />

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {tiers.map((tier, i) => (
              <Reveal key={tier.name} direction="up" delay={i * 80}>
                <div
                  className={`landing-card-hover card relative flex h-full flex-col p-8 ${
                    tier.highlight ? "border-brand-400/50 shadow-glow lg:-mt-2 lg:mb-2" : ""
                  }`}
                >
                  {tier.highlight && (
                    <span className="badge absolute -top-3 left-8 bg-brand-500 text-white">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-fg">{tier.name}</h3>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-fg">{tier.price}</span>
                    <span className="pb-1 text-slate-500">{tier.period}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-400">{tier.blurb}</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 flex-none text-brand-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/signup"
                    className={`mt-8 w-full ${tier.highlight ? "btn-primary" : "btn-ghost"}`}
                  >
                    {tier.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — full bleed within wide container */}
      <section className="container-wide pb-20 pt-4 sm:pb-28">
        <Reveal direction="up">
          <div className="relative overflow-hidden rounded-2xl border border-surface-line px-8 py-14 sm:px-14 sm:py-16 lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-600/20 via-fuchsia-600/10 to-transparent" />
            <div className="relative max-w-2xl text-left">
              <h2 className="text-3xl font-bold text-fg sm:text-4xl">
                Ready to automate your outreach?
              </h2>
              <p className="mt-3 text-lg text-slate-300">
                Add your content, launch a campaign, and let PulseFlow write personalized emails
                grounded in what you publish.
              </p>
            </div>
            <Link
              to="/signup"
              className="btn-primary relative mt-8 shrink-0 px-10 py-4 text-base group lg:mt-0"
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-line bg-ink-900/80">
        <div className="container-wide flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
          <Logo />
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} PulseFlow AI
          </p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-fg"
          >
            <Github className="h-4 w-4" /> GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
