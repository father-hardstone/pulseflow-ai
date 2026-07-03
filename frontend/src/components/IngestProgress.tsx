import type { LucideIcon } from "lucide-react";
import {
  Globe,
  FileText,
  Scissors,
  Sparkles,
  Database,
  CircleCheck,
  Upload,
  ScanText,
  Layers,
  Eye,
} from "lucide-react";
import PipelineProgress, { type PipelineStep } from "./PipelineProgress";

export type IngestStepId =
  | "rasterize"
  | "ocr"
  | "analyze"
  | "fetch"
  | "chunk"
  | "embed"
  | "store"
  | "finalize";
export type IngestStepStatus = "pending" | "running" | "done" | "failed";

export interface IngestStepState {
  id: IngestStepId;
  label: string;
  status: IngestStepStatus;
  detail?: string;
  icon: LucideIcon;
}

export const INGEST_STEP_ORDER: IngestStepId[] = [
  "rasterize",
  "ocr",
  "analyze",
  "fetch",
  "chunk",
  "embed",
  "store",
  "finalize",
];

export type IngestMode = "url" | "text" | "file";

export function fileMayUseOcr(file: File | null): boolean {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return /\.(pdf|png|jpe?g|webp)$/i.test(name);
}

export function isImageFile(file: File | null): boolean {
  if (!file) return false;
  return /\.(png|jpe?g|webp)$/i.test(file.name.toLowerCase());
}

export function isPdfFile(file: File | null): boolean {
  if (!file) return false;
  return /\.pdf$/i.test(file.name.toLowerCase());
}

export function fileSupportsVision(file: File | null): boolean {
  return isImageFile(file) || isPdfFile(file);
}

export function buildIngestSteps(
  mode: IngestMode,
  options?: { ocr?: boolean; analyze?: boolean }
): IngestStepState[] {
  const useOcr = options?.ocr ?? false;
  const useAnalyze = options?.analyze ?? false;
  const fetchLabel =
    mode === "url"
      ? "Fetch source content"
      : mode === "file"
        ? useAnalyze
          ? "Prepare image analysis"
          : useOcr
            ? "Assemble extracted text"
            : "Extract document text"
        : "Prepare pasted content";
  const FetchIcon = mode === "url" ? Globe : mode === "file" ? Upload : FileText;

  const steps: IngestStepState[] = [];

  if (useOcr) {
    steps.push(
      {
        id: "rasterize",
        label: "Prepare pages for OCR",
        status: "pending",
        icon: Layers,
      },
      {
        id: "ocr",
        label: "OCR with Groq Vision",
        status: "pending",
        icon: ScanText,
      }
    );
  }

  if (useAnalyze) {
    steps.push({
      id: "analyze",
      label: "Analyze image with Groq Vision",
      status: "pending",
      icon: Eye,
    });
  }

  steps.push(
    {
      id: "fetch",
      label: fetchLabel,
      status: "pending",
      icon: FetchIcon,
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
    }
  );

  return steps;
}

function stepDetail(id: IngestStepId, detail?: Record<string, unknown>): string | undefined {
  if (!detail) return undefined;

  if (detail.skipped) {
    const reason = typeof detail.reason === "string" ? detail.reason : "Not needed";
    return `Skipped — ${reason}`;
  }

  if (id === "rasterize") {
    if (typeof detail.page === "number") return `Rendering page ${detail.page}…`;
    if (typeof detail.pages === "number") return `${detail.pages} page(s) prepared`;
  }

  if (id === "ocr") {
    if (typeof detail.page === "number" && typeof detail.total === "number" && detail.total > 0) {
      const chars =
        typeof detail.characters === "number"
          ? ` · ${detail.characters.toLocaleString()} chars`
          : "";
      return `Page ${detail.page} of ${detail.total}${chars}`;
    }
    if (typeof detail.pages === "number") {
      const chars =
        typeof detail.characters === "number"
          ? ` · ${detail.characters.toLocaleString()} characters`
          : "";
      return `${detail.pages} page(s) OCR'd${chars}`;
    }
    if (typeof detail.model === "string") return detail.model;
  }

  if (id === "analyze") {
    if (typeof detail.page === "number" && typeof detail.total === "number" && detail.total > 0) {
      const chars =
        typeof detail.characters === "number"
          ? ` · ${detail.characters.toLocaleString()} chars`
          : "";
      return `Page ${detail.page} of ${detail.total}${chars}`;
    }
    if (typeof detail.pages === "number") {
      const chars =
        typeof detail.characters === "number"
          ? ` · ${detail.characters.toLocaleString()} characters`
          : "";
      return `${detail.pages} page(s) analyzed${chars}`;
    }
    if (typeof detail.model === "string") return detail.model;
  }

  if (id === "fetch" && typeof detail.characters === "number") {
    const method = typeof detail.method === "string" ? detail.method : "";
    if (method === "text-layer") return `${detail.characters.toLocaleString()} characters (PDF text layer)`;
    if (method === "ocr") return `${detail.characters.toLocaleString()} characters (OCR)`;
    if (method === "vision-analysis") {
      return `${detail.characters.toLocaleString()} characters (image analysis)`;
    }
    if (method === "vision-combined") {
      return `${detail.characters.toLocaleString()} characters (meta analysis + OCR)`;
    }
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
  const hasStep = steps.some((s) => s.id === stepId);
  if (!hasStep) return steps;

  return steps.map((s) => {
    if (s.id !== stepId) return s;
    return {
      ...s,
      status,
      detail: stepDetail(stepId, detail),
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
