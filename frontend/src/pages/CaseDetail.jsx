import { useCallback, useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, Lightbulb, MessageSquare, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import api, { formatApiError } from "@/lib/api";
import StatusBadge, { PriorityScoreBadge } from "@/components/StatusBadge";
import AssessmentModal from "@/components/AssessmentModal";

function Card({ title, icon: Icon, children, testid }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm" data-testid={testid}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/cases/${id}`);
      setData(res.data);
    } catch (err) {
      toast.error(formatApiError(err));
      navigate("/cases");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) return null;

  const { case: c, checkins, assessments, alerts, why_flagged, recommended_next_step } = data;

  return (
    <div className="p-4 lg:p-8 max-w-[1100px] mx-auto space-y-5">
      <Link to="/cases" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-3.5 w-3.5" />
        All cases
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500 mono">{c.case_id}</div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">{c.alias}</h1>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <StatusBadge status={c.status} />
            <PriorityScoreBadge score={c.priority_score} />
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{c.channel}</span>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{c.stage}</span>
          </div>
        </div>
        <button
          onClick={() => setAssessing(true)}
          data-testid="case-assess-btn"
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-sm font-semibold px-5 py-2.5 shadow-md shadow-indigo-500/20 transition-all"
        >
          Start Assessment
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Why flagged" icon={AlertTriangle} testid="why-flagged-card">
          <ul className="space-y-1.5">
            {why_flagged.map((r, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-rose-500 mt-1">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-indigo-50/60 border border-indigo-100 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Recommended next step
            </div>
            <div className="mt-1.5 text-sm text-slate-800 leading-relaxed">
              {recommended_next_step}
            </div>
          </div>
        </Card>

        <Card title="Alerts" icon={MessageSquare} testid="alerts-card">
          {alerts.length === 0 ? (
            <div className="text-sm text-slate-400">No alerts for this case.</div>
          ) : (
            <ul className="space-y-2.5">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className={`rounded-lg border px-3 py-2.5 text-sm ${
                    a.read
                      ? "border-slate-200 bg-slate-50 text-slate-500"
                      : "border-rose-200 bg-rose-50/60 text-rose-800"
                  }`}
                >
                  <div className="font-medium capitalize">{a.type}</div>
                  <div className="text-xs mt-0.5">{a.reason}</div>
                  <div className="text-[10px] mt-1 opacity-70 mono">
                    {dayjs(a.created_at).format("DD MMM YYYY, HH:mm")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Check-in history" icon={ClipboardList} testid="checkins-card">
        {checkins.length === 0 ? (
          <div className="text-sm text-slate-400">No check-ins recorded.</div>
        ) : (
          <ul className="space-y-2.5">
            {[...checkins].reverse().map((ck) => (
              <li key={ck.id} className="flex gap-4 items-start">
                <div className="w-12 flex-shrink-0 text-center">
                  <div
                    className={`text-sm font-bold mono ${
                      ck.score <= 4
                        ? "text-rose-600"
                        : ck.score <= 6
                        ? "text-yellow-700"
                        : "text-emerald-600"
                    }`}
                  >
                    {ck.score}
                  </div>
                  <div className="text-[9px] uppercase text-slate-400">score</div>
                </div>
                <div className="flex-1 min-w-0 border-l border-slate-100 pl-4">
                  <div className="text-sm text-slate-800">{ck.note || "—"}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 mono">
                    {dayjs(ck.timestamp).format("DD MMM YYYY, HH:mm")}
                    {ck.source ? ` · ${ck.source}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Assessments" icon={ClipboardList} testid="assessments-card">
        {assessments.length === 0 ? (
          <div className="text-sm text-slate-400">No assessments submitted yet.</div>
        ) : (
          <ul className="space-y-3">
            {assessments.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-900">{a.counsellor_name}</div>
                  <StatusBadge status={a.outcome} />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Outcome {a.outcome_score}/100 · {dayjs(a.created_at).format("DD MMM YYYY, HH:mm")}
                </div>
                {a.answers?.notes && (
                  <div className="text-sm text-slate-700 mt-2">“{a.answers.notes}”</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {assessing && (
        <AssessmentModal caseItem={c} onClose={() => setAssessing(false)} onDone={load} />
      )}
    </div>
  );
}
