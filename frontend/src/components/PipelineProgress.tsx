import type { LucideIcon } from "lucide-react";
import { CircleCheck, Loader2, XCircle } from "lucide-react";

export type PipelineStepStatus = "pending" | "running" | "done" | "failed";

export interface PipelineStep {
  id: string;
  label: string;
  status: PipelineStepStatus;
  detail?: string;
  icon: LucideIcon;
}

interface PipelineProgressProps {
  title: string;
  steps: PipelineStep[];
  visible: boolean;
}

export default function PipelineProgress({ title, steps, visible }: PipelineProgressProps) {
  if (!visible) return null;

  return (
    <div className="rounded-xl border border-surface-line bg-ink-900/50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">{title}</p>
      <ul className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const isRunning = step.status === "running";
          const isDone = step.status === "done";
          const isFailed = step.status === "failed";

          return (
            <li
              key={step.id}
              className={`flex items-start gap-3 rounded-lg px-2 py-2 transition-colors ${
                isRunning
                  ? "bg-brand-500/10"
                  : isDone
                    ? "bg-emerald-500/10"
                    : isFailed
                      ? "bg-rose-500/10"
                      : ""
              }`}
            >
              <span
                className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                  isRunning
                    ? "text-brand-400"
                    : isDone
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                      : isFailed
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        : "bg-surface-overlay text-fg-muted"
                }`}
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFailed ? (
                  <XCircle className="h-4 w-4" />
                ) : isDone ? (
                  <CircleCheck className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    isRunning
                      ? "text-brand-300"
                      : isDone
                        ? "text-emerald-700 dark:text-emerald-300"
                        : isFailed
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-fg-muted"
                  }`}
                >
                  {step.label}
                </p>
                {step.detail && (
                  <p
                    className={`mt-0.5 text-xs ${
                      isFailed ? "text-rose-500 dark:text-rose-300" : "text-fg-muted"
                    }`}
                  >
                    {step.detail}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function patchPipelineStep(
  steps: PipelineStep[],
  stepId: string,
  patch: { status?: PipelineStepStatus; detail?: string }
): PipelineStep[] {
  return steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
}
