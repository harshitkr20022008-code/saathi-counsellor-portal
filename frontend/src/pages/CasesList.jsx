import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "@/lib/api";
import StatusBadge, { PriorityScoreBadge } from "@/components/StatusBadge";
import Sparkline from "@/components/Sparkline";
import dayjs from "dayjs";

export default function CasesList() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/cases");
      setCases(data.cases || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Cases</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {loading ? "Loading…" : `${cases.length} assigned case${cases.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No cases assigned yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cases.map((c) => (
              <li key={c.id}>
                <button
                  data-testid={`case-list-item-${c.case_id}`}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">{c.alias}</div>
                    <div className="text-xs text-slate-500 mono">{c.case_id}</div>
                  </div>
                  <div className="hidden sm:block">
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="hidden sm:block">
                    <PriorityScoreBadge score={c.priority_score} />
                  </div>
                  <div className="hidden md:block">
                    <Sparkline
                      data={c.sparkline || []}
                      color={
                        c.status === "urgent"
                          ? "#EF4444"
                          : c.status === "priority"
                          ? "#F97316"
                          : c.status === "review"
                          ? "#EAB308"
                          : "#10B981"
                      }
                    />
                  </div>
                  <div className="text-xs text-slate-500 hidden lg:block w-28 text-right">
                    {c.last_checkin ? dayjs(c.last_checkin).format("DD MMM, HH:mm") : "—"}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
