import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

export default function Sparkline({ data = [], color = "#4F46E5" }) {
  if (!data.length) return <div className="text-xs text-slate-400">No data</div>;
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-24 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <YAxis domain={[0, 10]} hide />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
