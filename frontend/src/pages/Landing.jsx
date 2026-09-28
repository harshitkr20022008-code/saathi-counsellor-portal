import { useNavigate } from "react-router-dom";
import { ShieldCheck, HeartHandshake, Users2, Lock, ArrowRight } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <HeartHandshake className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold tracking-tight text-lg">SAATHI</div>
              <div className="text-xs text-slate-400 -mt-0.5">Trauma-informed case tracking</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock className="h-3.5 w-3.5" />
            <span>Encrypted • Alias-only • Confidential</span>
          </div>
        </div>

        <div className="mt-16 lg:mt-24 grid lg:grid-cols-2 gap-16 items-center">
          <div className="saathi-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Survivor-safe dashboard for counsellors
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white">
              Every survivor deserves a<br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">timely, informed response.</span>
            </h1>
            <p className="mt-6 text-slate-400 text-base leading-relaxed max-w-xl">
              SAATHI helps counsellors track cases with dignity — priority-scored alerts, well-being trends, and structured assessments, all built around alias-only privacy.
            </p>
          </div>

          <div className="grid gap-4 saathi-fade-up" style={{ animationDelay: "80ms" }}>
            <button
              data-testid="role-counsellor-btn"
              onClick={() => navigate("/login")}
              className="group text-left p-6 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-indigo-400/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                  <Users2 className="h-6 w-6 text-indigo-300" />
                </div>
                <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-4 text-white font-semibold text-lg">I am a Counsellor</div>
              <div className="mt-1 text-sm text-slate-400">Access assigned cases, alerts, and assessments.</div>
            </button>

            <button
              data-testid="role-victim-btn"
              onClick={() => navigate("/victim")}
              className="group text-left p-6 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-violet-400/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="h-12 w-12 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                  <HeartHandshake className="h-6 w-6 text-violet-300" />
                </div>
                <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-violet-300 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-4 text-white font-semibold text-lg">I am a Survivor</div>
              <div className="mt-1 text-sm text-slate-400">Reach out for support — coming soon.</div>
            </button>
          </div>
        </div>

        <div className="mt-24 text-center text-xs text-slate-500">
          Prototype • Alias-only data • No PII stored
        </div>
      </div>
    </div>
  );
}
