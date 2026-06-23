import type { LucideIcon } from "lucide-react";
import { Globe, FileText, Scissors, Sparkles, Database, CircleCheck } from "lucide-react";
import PipelineProgress, { type PipelineStep } from "./PipelineProgress";

export type IngestStepId = "fetch" | "chunk" | "embed" | "store" | "finalize";
export type IngestStepStatus = "pending" | "running" | "done" | "failed";

export interface IngestStepState {
  id: IngestStepId;
  label: string;
  status: IngestStepStatus;
  detail?: string;
  icon: LucideIcon;
}

export const INGEST_STEP_ORDER: IngestStepId[] = [
  "fetch",
  "chunk",
  "embed",
  "store",
  "finalize",
];

export function buildIngestSteps(mode: "url" | "text"): IngestStepState[] {
  return [
    {
      id: "fetch",
      label: mode === "url" ? "Fetch source content" : "Prepare pasted content",
      status: "pending",
      icon: mode === "url" ? Globe : FileText,
    },
    {
      id: "chunk",
      label: "Split into chunks",
      status: "pending",
      icon: Scissors,
    },
    {
      id: "embed",
      label: "Generate embeddings",
      status: "pending",
      icon: Sparkles,
    },
    {
      id: "store",
      label: "Store vectors in Supabase",
      status: "pending",
      icon: Database,
    },
    {
      id: "finalize",
      label: "Finalize knowledge source",
      status: "pending",
      icon: CircleCheck,
    },
  ];
}

function stepDetail(id: IngestStepId, detail?: Record<string, unknown>): string | undefined {
  if (!detail) return undefined;
  if (id === "fetch" && typeof detail.characters === "number") {
    return `${detail.characters.toLocaleString()} characters`;
  }
  if (id === "chunk" && typeof detail.count === "number") {
    return `${detail.count} chunks`;
  }
  if (id === "embed" && typeof detail.dimensions === "number") {
    const count = detail.count;
    return count
      ? `${count} vectors · ${detail.dimensions}-dim`
      : `${detail.dimensions}-dim embeddings`;
  }
  if (id === "store" && typeof detail.count === "number") {
    return `${detail.count} vectors saved`;
  }
  if (detail.error && typeof detail.error === "string") {
    return detail.error;
  }
  return undefined;
}

export function applyIngestStepEvent(
  steps: IngestStepState[],
  stepId: IngestStepId,
  status: "running" | "done" | "failed",
  detail?: Record<string, unknown>
): IngestStepState[] {
  return steps.map((s) => {
    if (s.id !== stepId) return s;
    return {
      ...s,
      status,
      detail: status === "failed" ? stepDetail(stepId, detail) : stepDetail(stepId, detail),
    };
  });
}

interface IngestProgressProps {
  steps: IngestStepState[];
  visible: boolean;
}

export default function IngestProgress({ steps, visible }: IngestProgressProps) {
  return (
    <PipelineProgress
      title="Ingest pipeline"
      steps={steps as PipelineStep[]}
      visible={visible}
    />
  );
}
