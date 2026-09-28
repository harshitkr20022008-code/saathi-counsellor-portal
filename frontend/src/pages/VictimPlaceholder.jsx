import { Link } from "react-router-dom";
import { ArrowLeft, HeartHandshake, PhoneCall } from "lucide-react";

export default function VictimPlaceholder() {
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center px-4">
      <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-violet-600/15 blur-3xl" />

      <div className="relative w-full max-w-lg text-center">
        <div className="inline-flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <HeartHandshake className="h-5 w-5 text-white" />
          </div>
          <div className="text-white font-bold tracking-tight text-lg text-left">
            SAATHI
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-normal">
              Survivor support
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10">
          <h1 className="text-2xl font-bold text-white">This space is coming soon.</h1>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed">
            The survivor-facing check-in flow is not live yet. If you need support right now,
            please use a helpline below — you do not need to wait.
          </p>

          <a
            href="tel:112"
            data-testid="victim-helpline-btn"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 hover:bg-rose-500/25 px-6 py-3 text-sm font-semibold transition-all"
          >
            <PhoneCall className="h-4 w-4" />
            Call 112 — Emergency
          </a>

          <div className="mt-6 text-xs text-slate-500">
            You can also speak to a counsellor by calling your local helpline directory.
          </div>
        </div>

        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
