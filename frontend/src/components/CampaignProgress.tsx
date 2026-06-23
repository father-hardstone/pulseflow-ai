import {
  Rocket,
  Search,
  Users,
  Brain,
  Sparkles,
  CircleCheck,
  Database,
} from "lucide-react";
import PipelineProgress, {
  patchPipelineStep,
  type PipelineStep,
  type PipelineStepStatus,
} from "./PipelineProgress";

export type CampaignStepId = "trigger" | "apollo" | "import" | "generate" | "finalize";
export type GenerateStepId = "retrieve" | "llm" | "save";

export function buildCampaignSteps(): PipelineStep[] {
  return [
    {
      id: "trigger",
      label: "Submit campaign to n8n",
      status: "pending",
      icon: Rocket,
    },
    {
      id: "apollo",
      label: "Search Apollo for leads",
      status: "pending",
      icon: Search,
    },
    {
      id: "import",
      label: "Import leads to outreach matrix",
      status: "pending",
      icon: Users,
    },
    {
      id: "generate",
      label: "Generate personalized emails (RAG + AI)",
      status: "pending",
      icon: Sparkles,
    },
    {
      id: "finalize",
      label: "Campaign ready",
      status: "pending",
      icon: CircleCheck,
    },
  ];
}

export type EnrichmentStepId = "enrich" | "import" | "generate" | "finalize";

export function buildEnrichmentSteps(): PipelineStep[] {
  return [
    {
      id: "enrich",
      label: "Enrich company via Apollo",
      status: "pending",
      icon: Search,
    },
    {
      id: "import",
      label: "Save inbound lead to outreach matrix",
      status: "pending",
      icon: Users,
    },
    {
      id: "generate",
      label: "Generate personalized email (RAG + AI)",
      status: "pending",
      icon: Sparkles,
    },
    {
      id: "finalize",
      label: "Enrichment ready",
      status: "pending",
      icon: CircleCheck,
    },
  ];
}

export function buildGenerateSteps(): PipelineStep[] {
  return [
    {
      id: "retrieve",
      label: "Retrieve knowledge context",
      status: "pending",
      icon: Database,
    },
    {
      id: "llm",
      label: "Generate outreach email",
      status: "pending",
      icon: Brain,
    },
    {
      id: "save",
      label: "Save to lead",
      status: "pending",
      icon: CircleCheck,
    },
  ];
}

export function patchCampaignStep(
  steps: PipelineStep[],
  stepId: CampaignStepId | GenerateStepId | EnrichmentStepId,
  status: PipelineStepStatus,
  detail?: string
): PipelineStep[] {
  return patchPipelineStep(steps, stepId, { status, detail });
}

interface CampaignProgressProps {
  steps: PipelineStep[];
  visible: boolean;
  title?: string;
}

export default function CampaignProgress({
  steps,
  visible,
  title = "Campaign pipeline",
}: CampaignProgressProps) {
  return <PipelineProgress title={title} steps={steps} visible={visible} />;
}
