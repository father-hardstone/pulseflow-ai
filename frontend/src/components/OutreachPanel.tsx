import { useEffect, useRef, useState } from "react";
import { api, type ApolloUsage, type HealthConfigured, type Lead } from "../lib/api";
import { DEFAULT_EMAIL_TONE, type EmailToneId } from "../lib/emailTones";
import EmailPreviewModal from "./EmailPreviewModal";
import OutreachLaunchpad from "./OutreachLaunchpad";
import OutreachMatrix from "./OutreachMatrix";
import {
  buildCampaignSteps,
  buildEnrichmentSteps,
  buildGenerateSteps,
  patchCampaignStep,
  type CampaignStepId,
  type EnrichmentStepId,
} from "./CampaignProgress";
import type { PipelineStep } from "./PipelineProgress";
import type { CampaignMethod, InputMode, ProspectProvider } from "./outreachTypes";

const CAMPAIGN_POLL_MS = 2000;
const CAMPAIGN_TIMEOUT_MS = 120000;

function leadsSinceLaunch(all: Lead[], startedAt: number): Lead[] {
  const cutoff = startedAt - 3000;
  return all.filter((l) => new Date(l.created_at).getTime() >= cutoff);
}

export default function OutreachPanel({
  onChanged,
  health,
}: {
  onChanged: () => void;
  health?: HealthConfigured | null;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<Lead | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [apollo, setApollo] = useState<ApolloUsage | null>(null);

  const [campaignMethod, setCampaignMethod] = useState<CampaignMethod>("inbound");
  const [inputMode, setInputMode] = useState<InputMode>("domain");
  const [prospectProvider, setProspectProvider] = useState<ProspectProvider>("apollo");
  const [domain, setDomain] = useState("");
  const [inboundEmail, setInboundEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [limit, setLimit] = useState(1);
  const [objective, setObjective] = useState("");
  const [tone, setTone] = useState<EmailToneId>(DEFAULT_EMAIL_TONE);

  const [campaignSteps, setCampaignSteps] = useState<PipelineStep[] | null>(null);
  const [showCampaignProgress, setShowCampaignProgress] = useState(false);
  const [campaignActive, setCampaignActive] = useState(false);
  const [generateSteps, setGenerateSteps] = useState<PipelineStep[] | null>(null);
  const [showGenerateProgress, setShowGenerateProgress] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const maxPerCampaign = apollo?.limits.maxPerCampaign ?? 10;
  const maxAllowedNow = apollo
    ? Math.min(maxPerCampaign, apollo.userRemaining, apollo.globalRemaining)
    : 1;

  function clearPoll() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => clearPoll(), []);

  async function load() {
    setLoading(true);
    try {
      const [leadsRes, quotaRes] = await Promise.all([api.listLeads(), api.apolloQuota()]);
      setLeads(leadsRes.leads);
      setApollo(quotaRes.apollo);
      setLimit((prev) => {
        const def = quotaRes.apollo.limits.defaultPerCampaign;
        const cap = Math.min(
          quotaRes.apollo.limits.maxPerCampaign,
          quotaRes.apollo.userRemaining,
          quotaRes.apollo.globalRemaining
        );
        if (cap <= 0) return 0;
        if (prev === 0 || prev > cap) return Math.min(def, cap);
        return prev;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function stopCampaign() {
    clearPoll();
    setCampaignActive(false);
    setCampaignSteps((prev) => {
      if (!prev) return prev;
      let steps = prev;
      const running = steps.find((s) => s.status === "running");
      if (running) {
        steps = patchCampaignStep(
          steps,
          running.id as CampaignStepId | EnrichmentStepId,
          "failed",
          "Stopped"
        );
      }
      const finalize = steps.find((s) => s.id === "finalize");
      if (finalize?.status === "pending") {
        steps = patchCampaignStep(steps, "finalize", "failed", "Cancelled");
      }
      return steps;
    });
    setNotice("Campaign stopped.");
    load();
  }

  function pollCampaignPipeline(startedAt: number) {
    clearPoll();
    pollRef.current = setInterval(async () => {
      try {
        const [leadsRes, quotaRes] = await Promise.all([api.listLeads(), api.apolloQuota()]);
        setLeads(leadsRes.leads);
        setApollo(quotaRes.apollo);

        const batch = leadsSinceLaunch(leadsRes.leads, startedAt);
        const added = batch.length;
        const completed = batch.filter((l) => l.status === "completed").length;
        const failed = batch.filter((l) => l.status === "failed").length;
        const inFlight = batch.filter(
          (l) => l.status === "pending" || l.status === "processing"
        ).length;
        const timedOut = Date.now() - startedAt > CAMPAIGN_TIMEOUT_MS;

        setCampaignSteps((prev) => {
          if (!prev) return prev;
          let steps = prev;

          if (added > 0) {
            steps = patchCampaignStep(steps, "apollo", "done", `${added} lead${added === 1 ? "" : "s"}`);
            steps = patchCampaignStep(steps, "import", "done", "In matrix");
          }

          if (added > 0 && (inFlight > 0 || completed + failed < added)) {
            steps = patchCampaignStep(steps, "generate", "running", `${completed + failed}/${added}`);
          }

          const allTerminal = added > 0 && inFlight === 0 && completed + failed === added;
          if (allTerminal) {
            steps = patchCampaignStep(
              steps,
              "generate",
              failed > 0 && completed === 0 ? "failed" : "done"
            );
            steps = patchCampaignStep(steps, "finalize", "done");
            clearPoll();
            setCampaignActive(false);
            setNotice(`Campaign complete — ${completed} email${completed === 1 ? "" : "s"} ready.`);
            setTimeout(() => {
              setShowCampaignProgress(false);
              setCampaignSteps(null);
            }, 5000);
            onChanged();
          } else if (timedOut && !allTerminal) {
            setCampaignActive(false);
            if (added === 0) {
              steps = patchCampaignStep(steps, "apollo", "failed", "Timed out");
              setError("Campaign timed out with no leads saved.");
            }
            clearPoll();
          }

          return steps;
        });
      } catch {
        /* keep polling */
      }
    }, CAMPAIGN_POLL_MS);
  }

  async function launchInbound() {
    const domainVal = domain.trim();
    const emailVal = inboundEmail.trim();

    if (inputMode === "domain" && !domainVal) {
      setError("Enter a company domain.");
      return;
    }
    if (inputMode === "email" && !emailVal) {
      setError("Enter an inbound email.");
      return;
    }
    if (maxAllowedNow <= 0) {
      setError("Monthly lead quota exhausted.");
      return;
    }

    setLaunching(true);
    setCampaignActive(true);
    setShowCampaignProgress(true);
    let steps = buildEnrichmentSteps();
    steps = patchCampaignStep(steps, "enrich", "running");
    setCampaignSteps(steps);

    try {
      const res = await api.launchCampaign({
        domain: inputMode === "domain" ? domainVal : undefined,
        inboundEmail: inputMode === "email" ? emailVal : undefined,
        objective,
        tone,
      });

      const company = res.enrichment?.name || "Company";
      steps = patchCampaignStep(steps, "enrich", "done", company);
      steps = patchCampaignStep(steps, "import", "done");
      steps = patchCampaignStep(
        steps,
        "generate",
        res.lead?.status === "completed" ? "done" : "failed"
      );
      steps = patchCampaignStep(steps, "finalize", res.lead?.status === "completed" ? "done" : "failed");
      setCampaignSteps([...steps]);

      if (res.lead) {
        setLeads((prev) => [res.lead!, ...prev.filter((l) => l.id !== res.lead!.id)]);
      } else {
        await load();
      }

      if (res.apollo?.usage) {
        setApollo((prev) => (prev ? { ...prev, ...res.apollo!.usage } : prev));
      }

      setNotice(
        res.lead?.status === "completed"
          ? `Email ready for ${company}.`
          : `Enriched ${company} — retry generation if needed.`
      );

      setTimeout(() => {
        setShowCampaignProgress(false);
        setCampaignSteps(null);
      }, 5000);
      onChanged();
    } catch (e) {
      setCampaignSteps((prev) =>
        prev ? patchCampaignStep(prev, "enrich", "failed", (e as Error).message) : prev
      );
      setError((e as Error).message);
    } finally {
      setLaunching(false);
      setCampaignActive(false);
    }
  }

  async function launchProspecting() {
    if (!jobTitle.trim() && !industry.trim() && !location.trim()) {
      setError("Add at least one filter.");
      return;
    }
    if (maxAllowedNow <= 0) {
      setError("Monthly lead quota exhausted.");
      return;
    }

    setLaunching(true);
    setShowCampaignProgress(true);

    if (prospectProvider === "hunter") {
      setCampaignActive(true);
      let steps = buildEnrichmentSteps();
      steps = patchCampaignStep(steps, "enrich", "running", "Hunter discover");
      setCampaignSteps(steps);

      try {
        const res = await api.launchCampaign({
          jobTitle,
          industry,
          location,
          limit,
          objective,
          tone,
          prospectProvider: "hunter",
        });

        const count = res.leads?.length ?? 0;
        steps = patchCampaignStep(steps, "enrich", "done", `${count} found`);
        steps = patchCampaignStep(steps, "import", "done");
        steps = patchCampaignStep(steps, "generate", "done");
        steps = patchCampaignStep(steps, "finalize", "done");
        setCampaignSteps([...steps]);

        if (res.leads?.length) {
          setLeads((prev) => {
            const ids = new Set(res.leads!.map((l) => l.id));
            return [...res.leads!, ...prev.filter((l) => !ids.has(l.id))];
          });
        } else {
          await load();
        }

        if (res.apollo?.usage) {
          setApollo((prev) => (prev ? { ...prev, ...res.apollo!.usage } : prev));
        }

        setNotice(`Hunter campaign complete — ${count} lead${count === 1 ? "" : "s"}.`);
        setTimeout(() => {
          setShowCampaignProgress(false);
          setCampaignSteps(null);
        }, 5000);
        onChanged();
      } catch (e) {
        setCampaignSteps((prev) =>
          prev ? patchCampaignStep(prev, "enrich", "failed", (e as Error).message) : prev
        );
        setError((e as Error).message);
      } finally {
        setLaunching(false);
        setCampaignActive(false);
      }
      return;
    }

    const startedAt = Date.now();
    setCampaignActive(true);
    let steps = buildCampaignSteps();
    steps = patchCampaignStep(steps, "trigger", "running");
    setCampaignSteps(steps);

    try {
      steps = patchCampaignStep(steps, "trigger", "done");
      steps = patchCampaignStep(steps, "apollo", "running");
      setCampaignSteps([...steps]);

      const res = await api.launchCampaign({
        jobTitle,
        industry,
        location,
        limit,
        objective,
        tone,
        prospectProvider: "apollo",
      });

      setNotice(`Campaign launched — up to ${res.apollo?.appliedLimit ?? limit} leads.`);
      pollCampaignPipeline(startedAt);
      onChanged();
    } catch (e) {
      setCampaignActive(false);
      setCampaignSteps((prev) =>
        prev
          ? patchCampaignStep(patchCampaignStep(prev, "trigger", "failed"), "apollo", "failed")
          : prev
      );
      setError((e as Error).message);
    } finally {
      setLaunching(false);
    }
  }

  async function launch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    clearPoll();

    if (campaignMethod === "inbound") {
      await launchInbound();
    } else {
      await launchProspecting();
    }
  }

  async function generate(id: string) {
    setRowBusy((b) => ({ ...b, [id]: true }));
    setError("");
    setShowGenerateProgress(true);
    let steps = buildGenerateSteps();
    steps = patchCampaignStep(steps, "retrieve", "running");
    setGenerateSteps(steps);

    try {
      steps = patchCampaignStep(steps, "retrieve", "done");
      steps = patchCampaignStep(steps, "llm", "running");
      setGenerateSteps([...steps]);

      await api.generateLead(id, objective, tone);

      steps = patchCampaignStep(steps, "llm", "done");
      steps = patchCampaignStep(steps, "save", "done");
      setGenerateSteps([...steps]);
      await load();
      onChanged();
      setTimeout(() => {
        setShowGenerateProgress(false);
        setGenerateSteps(null);
      }, 4000);
    } catch (e) {
      setGenerateSteps((prev) =>
        prev ? patchCampaignStep(prev, "llm", "failed", (e as Error).message) : prev
      );
      setError((e as Error).message);
    } finally {
      setRowBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function generateAll() {
    setGeneratingAll(true);
    setError("");
    try {
      const res = await api.generateAll(objective, tone);
      setNotice(`Generated ${res.processed} emails.`);
      await load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGeneratingAll(false);
    }
  }

  async function clearAll() {
    await api.clearLeads();
    await load();
    onChanged();
  }

  const pendingCount = leads.filter((l) => l.status === "pending" || l.status === "failed").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <OutreachLaunchpad
        health={health}
        apollo={apollo}
        campaignMethod={campaignMethod}
        onCampaignMethod={setCampaignMethod}
        inputMode={inputMode}
        onInputMode={setInputMode}
        prospectProvider={prospectProvider}
        onProspectProvider={setProspectProvider}
        domain={domain}
        onDomain={setDomain}
        inboundEmail={inboundEmail}
        onInboundEmail={setInboundEmail}
        jobTitle={jobTitle}
        onJobTitle={setJobTitle}
        industry={industry}
        onIndustry={setIndustry}
        location={location}
        onLocation={setLocation}
        limit={limit}
        onLimit={setLimit}
        objective={objective}
        onObjective={setObjective}
        tone={tone}
        onTone={setTone}
        launching={launching}
        campaignActive={campaignActive}
        maxAllowedNow={maxAllowedNow}
        campaignSteps={campaignSteps}
        showCampaignProgress={showCampaignProgress}
        generateSteps={generateSteps}
        showGenerateProgress={showGenerateProgress}
        notice={notice}
        error={error}
        onSubmit={launch}
        onStop={stopCampaign}
      />

      <OutreachMatrix
        leads={leads}
        loading={loading}
        generatingAll={generatingAll}
        pendingCount={pendingCount}
        rowBusy={rowBusy}
        onPreview={setPreview}
        onGenerate={generate}
        onGenerateAll={generateAll}
        onClearAll={clearAll}
      />

      <EmailPreviewModal lead={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
