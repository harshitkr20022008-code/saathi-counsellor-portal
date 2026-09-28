import { Search, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import StatusBadge, { PriorityScoreBadge } from "./StatusBadge";
import Sparkline from "./Sparkline";
import dayjs from "dayjs";

const STATUSES = ["all", "urgent", "priority", "review", "routine"];

export default function CasesTable({ cases = [], onSelect, selectedId }) {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    let arr = cases;
    if (status !== "all") arr = arr.filter((c) => c.status === status);
    if (q.trim()) {
      const r = q.toLowerCase();
      arr = arr.filter((c) => c.alias.toLowerCase().includes(r) || c.case_id.toLowerCase().includes(r));
    }
    return arr;
  }, [cases, status, q]);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div>
          <div className="text-sm font-semibold text-slate-900">My Cases at a Glance</div>
          <div className="text-xs text-slate-500 mt-0.5">{filtered.length} of {cases.length} shown</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              data-testid="cases-search-input"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Case ID or Alias"
              className="pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-indigo-400 outline-none w-56"
            />
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                data-testid={`filter-status-${s}`}
                onClick={() => setStatus(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                  status === s ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto slim-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <th className="px-5 py-3 font-medium">Case</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Priority</th>
              <th className="px-3 py-3 font-medium">Trend</th>
              <th className="px-3 py-3 font-medium">Channel</th>
              <th className="px-3 py-3 font-medium">Last Check-in</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">No cases match your filters</td></tr>
            ) : filtered.map((c) => (
              <tr
                key={c.id}
                data-testid={`case-row-${c.case_id}`}
                onClick={() => onSelect && onSelect(c)}
                className={`border-b border-slate-50 cursor-pointer transition-colors ${
                  selectedId === c.id ? "bg-indigo-50/60" : "hover:bg-slate-50"
                }`}
              >
                <td className="px-5 py-3">
                  <div className="font-semibold text-slate-900">{c.alias}</div>
                  <div className="text-xs text-slate-500 mono">{c.case_id}</div>
                </td>
                <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-3 py-3"><PriorityScoreBadge score={c.priority_score} /></td>
                <td className="px-3 py-3">
                  <Sparkline
                    data={c.sparkline || []}
                    color={c.status === "urgent" ? "#EF4444" : c.status === "priority" ? "#F97316" : c.status === "review" ? "#EAB308" : "#10B981"}
                  />
                </td>
                <td className="px-3 py-3">
                  <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">{c.channel}</span>
                </td>
                <td className="px-3 py-3 text-xs text-slate-500">
                  {c.last_checkin ? dayjs(c.last_checkin).format("DD MMM, HH:mm") : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  <ChevronRight className="h-4 w-4 text-slate-400 inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
