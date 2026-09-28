import { useCallback, useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import KpiCard from "@/components/KpiCard";
import StatusDonut, { DonutLegend } from "@/components/StatusDonut";
import TrendChart from "@/components/TrendChart";
import CasesTable from "@/components/CasesTable";
import SelectedCasePanel from "@/components/SelectedCasePanel";
import AssessmentModal from "@/components/AssessmentModal";

const KPI_TYPES = ["urgent", "priority", "review", "routine"];

export default function Dashboard() {
  const [counts, setCounts] = useState({});
  const [points, setPoints] = useState([]);
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState(null);
  const [panelData, setPanelData] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [assessing, setAssessing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [summary, trend, list] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/dashboard/trend"),
        api.get("/cases"),
      ]);
      setCounts(summary.data.counts || {});
      setPoints(trend.data.points || []);
      setCases(list.data.cases || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectCase = useCallback(async (c) => {
    setSelected(c);
    setPanelLoading(true);
    setPanelData(null);
    try {
      const { data } = await api.get(`/cases/${c.id}`);
      setPanelData(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setPanelLoading(false);
    }
  }, []);

  async function onAssessed() {
    setAssessing(null);
    await load();
    if (selected) await selectCase(cases.find((c) => c.id === selected.id) || selected);
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Priority-scored overview of your assigned cases.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_TYPES.map((t) => (
          <KpiCard key={t} type={t} count={counts[t]} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Case mix</div>
          <div className="text-xs text-slate-500 mt-0.5 mb-2">
            Distribution across risk bands
          </div>
          <StatusDonut counts={counts} />
          <DonutLegend counts={counts} />
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Well-being trend</div>
          <div className="text-xs text-slate-500 mt-0.5 mb-2">
            Average score across your last 6 check-ins
          </div>
          <TrendChart points={points} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        {loading ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center text-sm text-slate-400">
            Loading cases…
          </div>
        ) : (
          <CasesTable
            cases={cases}
            selectedId={selected?.id}
            onSelect={selectCase}
          />
        )}

        <SelectedCasePanel
          data={panelData}
          loading={panelLoading}
          onClose={() => {
            setSelected(null);
            setPanelData(null);
          }}
          onAssess={(c) => setAssessing(c)}
        />
      </div>

      {assessing && (
        <AssessmentModal
          caseItem={assessing}
          onClose={() => setAssessing(null)}
          onDone={onAssessed}
        />
      )}
    </div>
  );
}
