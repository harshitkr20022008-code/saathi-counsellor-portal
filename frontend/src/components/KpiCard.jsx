import { AlertTriangle, AlertCircle, Eye, CheckCircle2 } from "lucide-react";

const CONFIG = {
  urgent:   { label: "Urgent Risk",     icon: AlertTriangle, strip: "bg-rose-500",   tint: "bg-rose-50",    ring: "text-rose-600" },
  priority: { label: "High Priority",   icon: AlertCircle,   strip: "bg-orange-500", tint: "bg-orange-50",  ring: "text-orange-600" },
  review:   { label: "Needs Review",    icon: Eye,           strip: "bg-yellow-500", tint: "bg-yellow-50",  ring: "text-yellow-700" },
  routine:  { label: "Routine / Stable",icon: CheckCircle2,  strip: "bg-emerald-500",tint: "bg-emerald-50", ring: "text-emerald-600" },
};

export default function KpiCard({ type, count }) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;
  return (
    <div
      data-testid={`kpi-${type}`}
      className="relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm overflow-hidden transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`kpi-accent-strip ${cfg.strip}`} />
      <div className="flex items-center justify-between mt-1">
        <div className={`h-10 w-10 rounded-xl ${cfg.tint} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${cfg.ring}`} />
        </div>
        <div className={`text-[10px] uppercase tracking-wider font-semibold ${cfg.ring}`}>{cfg.label}</div>
      </div>
      <div data-testid={`kpi-${type}-count`} className="mt-4 text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
        {count ?? 0}
      </div>
      <div className="mt-1 text-xs text-slate-500">assigned cases</div>
    </div>
  );
}
