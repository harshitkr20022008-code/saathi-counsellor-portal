import { AlertTriangle, ArrowRight, ClipboardCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatusBadge, { PriorityScoreBadge } from "./StatusBadge";

export default function SelectedCasePanel({ data, loading, onClose, onAssess }) {
  const navigate = useNavigate();

  if (!data && !loading) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 h-full flex flex-col items-center justify-center py-14 px-6 text-center">
        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
          <ClipboardCheck className="h-6 w-6 text-indigo-500" />
        </div>
        <div className="mt-4 text-sm font-semibold text-slate-900">Select a case to see context</div>
        <div className="text-xs text-slate-500 mt-1 max-w-xs">
          Click any row in your cases table to view flags and recommended next steps.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400">Loading…</div>;
  }

  const { case: c, why_flagged, recommended_next_step } = data;

  return (
    <div data-testid="selected-case-panel" className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-500 mono">{c.case_id}</div>
          <div className="text-base font-semibold text-slate-900">{c.alias}</div>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={c.status} />
            <PriorityScoreBadge score={c.priority_score} />
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
            Why Flagged
          </div>
          <ul className="mt-2 space-y-1.5">
            {why_flagged.map((r, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-rose-500 mt-1">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Recommended Next Step</div>
          <div className="mt-1.5 text-sm text-slate-800 leading-relaxed">{recommended_next_step}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            data-testid="start-assessment-btn"
            onClick={() => onAssess && onAssess(c)}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-sm font-semibold py-2.5 shadow-md shadow-indigo-500/20 transition-all"
          >
            Start Assessment
          </button>
          <button
            data-testid="view-case-btn"
            onClick={() => navigate(`/cases/${c.id}`)}
            className="rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold py-2.5 transition-all inline-flex items-center justify-center gap-1"
          >
            View Case <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

