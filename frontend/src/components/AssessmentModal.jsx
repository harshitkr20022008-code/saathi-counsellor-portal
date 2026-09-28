import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";

const QUESTIONS = [
  { name: "distress_level", label: "Distress level", low: "Low", high: "Severe" },
  { name: "sleep_quality", label: "Sleep quality", low: "Very poor", high: "Excellent" },
  { name: "safety_feeling", label: "Feeling safe", low: "Unsafe", high: "Safe" },
  { name: "support_system", label: "Support system", low: "None", high: "Strong" },
  { name: "hopefulness", label: "Hopefulness", low: "Hopeless", high: "Hopeful" },
];

export default function AssessmentModal({ caseItem, onClose, onDone }) {
  const [answers, setAnswers] = useState(
    Object.fromEntries(QUESTIONS.map((q) => [q.name, 3]))
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  function set(name, value) {
    setAnswers((a) => ({ ...a, [name]: Number(value) }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post(`/cases/${caseItem.id}/assessment`, {
        ...answers,
        notes,
      });
      toast.success(`Assessment saved — outcome: ${data.assessment.outcome}`);
      onDone();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />
      <div
        data-testid="assessment-modal"
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between sticky top-0 bg-white">
          <div>
            <div className="text-sm font-semibold text-slate-900">Structured assessment</div>
            <div className="text-xs text-slate-500 mono mt-0.5">{caseItem.case_id}</div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-6">
          {QUESTIONS.map((q) => (
            <div key={q.name}>
              <div className="flex items-baseline justify-between mb-2">
                <label className="text-sm font-medium text-slate-900">{q.label}</label>
                <span className="text-xs font-semibold text-indigo-600">{answers[q.name]}/5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={answers[q.name]}
                onChange={(e) => set(q.name, e.target.value)}
                data-testid={`range-${q.name}`}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>1 · {q.low}</span>
                <span>5 · {q.high}</span>
              </div>
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              data-testid="assessment-notes"
              placeholder="Observations, safety plan, follow-up…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:border-indigo-400 resize-y"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold py-2.5 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              data-testid="assessment-submit"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold py-2.5 shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Saving…" : "Save assessment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
