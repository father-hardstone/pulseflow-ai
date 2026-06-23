import { Loader2, Trash2, Users, Wand2, Eye, Sparkles, Rocket } from "lucide-react";
import type { Lead } from "../lib/api";
import StatusBadge from "./StatusBadge";

interface OutreachMatrixProps {
  leads: Lead[];
  loading: boolean;
  generatingAll: boolean;
  pendingCount: number;
  rowBusy: Record<string, boolean>;
  onPreview: (lead: Lead) => void;
  onGenerate: (id: string) => void;
  onGenerateAll: () => void;
  onClearAll: () => void;
}

export default function OutreachMatrix({
  leads,
  loading,
  generatingAll,
  pendingCount,
  rowBusy,
  onPreview,
  onGenerate,
  onGenerateAll,
  onClearAll,
}: OutreachMatrixProps) {
  return (
    <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-surface-line px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Users className="h-4 w-4 text-brand-400" />
          <h3 className="font-semibold text-fg">Outreach Matrix</h3>
          <span className="text-sm text-slate-400">({leads.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onGenerateAll}
            className="btn-primary"
            disabled={generatingAll || pendingCount === 0}
          >
            {generatingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Generate all ({pendingCount})
          </button>
          {leads.length > 0 && (
            <button onClick={onClearAll} className="btn-ghost" title="Clear leads">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="grid place-items-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="grid place-items-center px-6 py-16 text-center">
            <Rocket className="h-10 w-10 text-slate-600" />
            <p className="mt-3 font-medium text-slate-300">No leads yet</p>
            <p className="mt-1 text-sm text-slate-500">Launch from the panel to populate the matrix.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface-overlay text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Lead</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Title</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.map((lead) => {
                const fullName = `${lead.first_name} ${lead.last_name}`.trim() || "Unknown";
                const busy = rowBusy[lead.id];
                return (
                  <tr key={lead.id} className="hover:bg-surface-overlay/60">
                    <td className="px-5 py-3">
                      <div className="font-medium text-fg">
                        {fullName === "Unknown" && lead.company_name
                          ? `${lead.company_name} team`
                          : fullName}
                      </div>
                      <div className="truncate text-xs text-slate-500">{lead.email}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-300">{lead.company_name || "—"}</td>
                    <td className="hidden px-5 py-3 text-slate-300 sm:table-cell">
                      {lead.job_title || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {lead.generated_email ? (
                          <button
                            onClick={() => onPreview(lead)}
                            className="btn-ghost px-3 py-1.5 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" /> Preview
                          </button>
                        ) : (
                          <button
                            onClick={() => onGenerate(lead.id)}
                            className="btn-primary px-3 py-1.5 text-xs"
                            disabled={busy}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            Generate
                          </button>
                        )}
                        {lead.generated_email && (
                          <button
                            onClick={() => onGenerate(lead.id)}
                            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface-overlay-hover hover:text-fg"
                            title="Regenerate"
                            disabled={busy}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Wand2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
