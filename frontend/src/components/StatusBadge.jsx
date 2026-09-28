const STYLES = {
  urgent:   "bg-rose-50 text-rose-700 border-rose-200",
  priority: "bg-orange-50 text-orange-700 border-orange-200",
  review:   "bg-yellow-50 text-yellow-800 border-yellow-200",
  routine:  "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const LABELS = { urgent: "Urgent", priority: "Priority", review: "Review", routine: "Routine" };

export default function StatusBadge({ status }) {
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STYLES[status] || STYLES.routine}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${
        status === "urgent" ? "bg-rose-500" :
        status === "priority" ? "bg-orange-500" :
        status === "review" ? "bg-yellow-500" : "bg-emerald-500"
      }`} />
      {LABELS[status] || "Routine"}
    </span>
  );
}

export function PriorityScoreBadge({ score = 0 }) {
  let cls = "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 80) cls = "text-rose-700 bg-rose-50 border-rose-200";
  else if (score >= 60) cls = "text-orange-700 bg-orange-50 border-orange-200";
  else if (score >= 40) cls = "text-yellow-800 bg-yellow-50 border-yellow-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold border ${cls} mono`}>
      {score}<span className="text-slate-400 font-normal">/100</span>
    </span>
  );
}
