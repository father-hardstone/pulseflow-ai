import {
  Rocket,
  Loader2,
  Gauge,
  AlertCircle,
  Check,
  Square,
  Building2,
  Search,
  Lock,
} from "lucide-react";
import type { ApolloUsage, HealthConfigured } from "../lib/api";
import { DEFAULT_EMAIL_TONE, EMAIL_TONES, type EmailToneId } from "../lib/emailTones";
import CampaignProgress, {
  buildCampaignSteps,
  buildEnrichmentSteps,
  buildGenerateSteps,
} from "./CampaignProgress";
import type { PipelineStep } from "./PipelineProgress";
import type { CampaignMethod, InputMode, ProspectProvider } from "./outreachTypes";

interface OutreachLaunchpadProps {
  health?: HealthConfigured | null;
  apollo: ApolloUsage | null;
  campaignMethod: CampaignMethod;
  onCampaignMethod: (m: CampaignMethod) => void;
  inputMode: InputMode;
  onInputMode: (m: InputMode) => void;
  prospectProvider: ProspectProvider;
  onProspectProvider: (p: ProspectProvider) => void;
  domain: string;
  onDomain: (v: string) => void;
  inboundEmail: string;
  onInboundEmail: (v: string) => void;
  jobTitle: string;
  onJobTitle: (v: string) => void;
  industry: string;
  onIndustry: (v: string) => void;
  location: string;
  onLocation: (v: string) => void;
  limit: number;
  onLimit: (v: number) => void;
  objective: string;
  onObjective: (v: string) => void;
  tone: EmailToneId;
  onTone: (v: EmailToneId) => void;
  launching: boolean;
  campaignActive: boolean;
  maxAllowedNow: number;
  campaignSteps: PipelineStep[] | null;
  showCampaignProgress: boolean;
  generateSteps: PipelineStep[] | null;
  showGenerateProgress: boolean;
  notice: string;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
}

export default function OutreachLaunchpad(props: OutreachLaunchpadProps) {
  const {
    health,
    apollo,
    campaignMethod,
    onCampaignMethod,
    inputMode,
    onInputMode,
    prospectProvider,
    onProspectProvider,
    domain,
    onDomain,
    inboundEmail,
    onInboundEmail,
    jobTitle,
    onJobTitle,
    industry,
    onIndustry,
    location,
    onLocation,
    limit,
    onLimit,
    objective,
    onObjective,
    tone,
    onTone,
    launching,
    campaignActive,
    maxAllowedNow,
    campaignSteps,
    showCampaignProgress,
    generateSteps,
    showGenerateProgress,
    notice,
    error,
    onSubmit,
    onStop,
  } = props;

  const maxPerCampaign = apollo?.limits.maxPerCampaign ?? 10;
  const quotaPct = apollo
    ? Math.min(100, Math.round((apollo.userUsed / apollo.limits.maxPerUserMonth) * 100))
    : 0;

  const apolloEnrichBlocked =
    health?.apolloEnrichment?.configured === true && health.apolloEnrichment.accessible === false;
  const apolloProspectingReady =
    health?.apolloApi?.accessible === true && health?.n8nWebhook?.live === true;
  const hunterProspectingReady = health?.hunterApi?.accessible === true;

  const prospectingLocked =
    campaignMethod === "prospecting" &&
    (prospectProvider === "apollo" ? !apolloProspectingReady : !hunterProspectingReady);

  const submitDisabled =
    launching ||
    campaignActive ||
    (campaignMethod === "inbound"
      ? maxAllowedNow <= 0 || apolloEnrichBlocked
      : prospectingLocked || maxAllowedNow <= 0);

  return (
    <form
      onSubmit={onSubmit}
      className="card flex max-h-full min-h-0 w-full shrink-0 flex-col overflow-hidden lg:w-[min(420px,38%)] xl:w-[min(440px,36%)]"
    >
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto p-5">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
            <Rocket className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-fg">Launchpad</h3>
            <p className="text-xs text-fg-muted">Enrich inbound leads or run cold outreach.</p>
          </div>
        </div>

        {apollo && (
          <div className="mt-4 rounded-xl border border-surface-line-subtle bg-ink-900/40 px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-fg-muted">
              <Gauge className="h-3.5 w-3.5" />
              Apollo quota
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-fg">
                {apollo.userUsed} / {apollo.limits.maxPerUserMonth}
              </span>
              <span className="text-[11px] text-fg-muted">{apollo.userRemaining} left</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-overlay">
              <div
                className={`h-full rounded-full ${quotaPct >= 85 ? "bg-amber-500" : "bg-brand-500"}`}
                style={{ width: `${quotaPct}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onCampaignMethod("inbound")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
              campaignMethod === "inbound"
                ? "border-brand-500/50 bg-brand-500/15 text-brand-200"
                : "border-surface-line-subtle text-fg-muted hover:bg-surface-overlay"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Inbound
            <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] font-medium text-emerald-400">
              Free
            </span>
          </button>
          <button
            type="button"
            onClick={() => onCampaignMethod("prospecting")}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
              campaignMethod === "prospecting"
                ? "border-brand-500/50 bg-brand-500/15 text-brand-200"
                : "border-surface-line-subtle text-fg-muted hover:bg-surface-overlay"
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Cold
            <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[9px] font-medium text-amber-400">
              Pro
            </span>
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="label">Email tone</label>
            <select className="input" value={tone} onChange={(e) => onTone(e.target.value as EmailToneId)}>
              {EMAIL_TONES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Objective</label>
            <input
              className="input"
              value={objective}
              onChange={(e) => onObjective(e.target.value)}
              placeholder="Book a demo, follow up on signup…"
            />
          </div>
        </div>

        {campaignMethod === "inbound" ? (
          <>
            <div className="mt-4 flex gap-1.5">
              <button
                type="button"
                onClick={() => onInputMode("domain")}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${
                  inputMode === "domain"
                    ? "border-brand-500/50 bg-brand-500/15 text-brand-200"
                    : "border-surface-line-subtle text-fg-muted"
                }`}
              >
                Domain
              </button>
              <button
                type="button"
                onClick={() => onInputMode("email")}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs ${
                  inputMode === "email"
                    ? "border-brand-500/50 bg-brand-500/15 text-brand-200"
                    : "border-surface-line-subtle text-fg-muted"
                }`}
              >
                Email
              </button>
            </div>
            <div className="mt-3">
              {inputMode === "domain" ? (
                <>
                  <label className="label">Company domain</label>
                  <input
                    className="input"
                    value={domain}
                    onChange={(e) => onDomain(e.target.value)}
                    placeholder="linear.app"
                  />
                </>
              ) : (
                <>
                  <label className="label">Inbound email</label>
                  <input
                    className="input"
                    type="email"
                    value={inboundEmail}
                    onChange={(e) => onInboundEmail(e.target.value)}
                    placeholder="ahmed@linear.app"
                  />
                </>
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <label className="label">Prospecting provider</label>
              <select
                className="input"
                value={prospectProvider}
                onChange={(e) => onProspectProvider(e.target.value as ProspectProvider)}
              >
                <option value="apollo">Apollo.io</option>
                <option value="hunter">Hunter.io</option>
              </select>
            </div>
            <div>
              <label className="label">Job title</label>
              <input
                className="input"
                value={jobTitle}
                onChange={(e) => onJobTitle(e.target.value)}
                placeholder="Founder, VP Sales"
                disabled={prospectingLocked}
              />
            </div>
            <div>
              <label className="label">Industry</label>
              <input
                className="input"
                value={industry}
                onChange={(e) => onIndustry(e.target.value)}
                placeholder="SaaS"
                disabled={prospectingLocked}
              />
            </div>
            <div>
              <label className="label">Location</label>
              <input
                className="input"
                value={location}
                onChange={(e) => onLocation(e.target.value)}
                placeholder="United States"
                disabled={prospectingLocked}
              />
            </div>
            <div>
              <label className="label">Max leads</label>
              <input
                className="input"
                type="number"
                min={maxAllowedNow > 0 ? 1 : 0}
                max={Math.max(1, maxAllowedNow)}
                value={limit}
                disabled={prospectingLocked || maxAllowedNow <= 0}
                onChange={(e) =>
                  onLimit(Math.min(maxAllowedNow, Math.max(1, Number(e.target.value) || 1)))
                }
              />
              <p className="mt-1 text-[10px] text-fg-muted">
                Cap {maxPerCampaign}/run · {maxAllowedNow} available
              </p>
            </div>
            {prospectingLocked && (
              <div className="flex items-center gap-2 rounded-lg border border-surface-line-subtle bg-surface-overlay/50 px-3 py-2 text-xs text-fg-muted">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                Protected feature — connect {prospectProvider === "apollo" ? "Apollo" : "Hunter.io"} to unlock.
              </div>
            )}
          </div>
        )}

        {apolloEnrichBlocked && campaignMethod === "inbound" && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Apollo enrich unavailable.
          </div>
        )}

        <CampaignProgress
          steps={
            campaignSteps ||
            (campaignMethod === "inbound" ? buildEnrichmentSteps() : buildCampaignSteps())
          }
          visible={showCampaignProgress}
          title={campaignMethod === "inbound" ? "Enrichment" : "Campaign"}
        />
        <CampaignProgress
          steps={generateSteps || buildGenerateSteps()}
          visible={showGenerateProgress}
          title="Generation"
        />
      </div>

      <div className="shrink-0 border-t border-surface-line px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {campaignActive && campaignMethod === "prospecting" && (
            <button
              type="button"
              onClick={onStop}
              className="btn-ghost border border-rose-500/35 px-3 py-1.5 text-xs text-rose-400"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop
            </button>
          )}
          <button type="submit" className="btn-primary flex-1 sm:flex-none" disabled={submitDisabled}>
            {launching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : campaignActive ? (
              <Check className="h-4 w-4" />
            ) : prospectingLocked && campaignMethod === "prospecting" ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {campaignMethod === "inbound"
              ? launching
                ? "Enriching…"
                : "Enrich & generate"
              : prospectingLocked
                ? "Locked"
                : launching
                  ? "Launching…"
                  : campaignActive
                    ? "Launched"
                    : "Launch campaign"}
          </button>
        </div>
        {notice && <p className="mt-2 text-xs text-emerald-300">{notice}</p>}
        {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
      </div>
    </form>
  );
}

export { DEFAULT_EMAIL_TONE };
