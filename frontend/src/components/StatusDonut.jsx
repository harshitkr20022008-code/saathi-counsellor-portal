import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = { urgent: "#EF4444", priority: "#F97316", review: "#EAB308", routine: "#10B981" };
const LABELS = { urgent: "Urgent", priority: "Priority", review: "Review", routine: "Routine" };

export default function StatusDonut({ counts = {} }) {
  const data = Object.keys(COLORS).map((k) => ({ name: LABELS[k], key: k, value: counts[k] || 0 }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }}
            formatter={(v, n) => [`${v} cases`, n]}
          />
          <Pie
            data={data}
            innerRadius={62}
            outerRadius={92}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={COLORS[entry.key]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-3xl font-extrabold text-slate-900">{total}</div>
        <div className="text-xs text-slate-500 uppercase tracking-wider">Total cases</div>
      </div>
    </div>
  );
}

export function DonutLegend({ counts = {} }) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-4">
      {Object.keys(COLORS).map((k) => (
        <div key={k} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[k] }} />
          <span className="text-slate-600">{LABELS[k]}</span>
          <span className="ml-auto font-semibold text-slate-900">{counts[k] || 0}</span>
        </div>
      ))}
    </div>
  );
}
