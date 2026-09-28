import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FolderKanban, Bell, BarChart3, Settings, LogOut,
  HeartHandshake, ShieldCheck, Menu, X, Globe, PhoneCall
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/cases", label: "Cases", icon: FolderKanban, testid: "nav-cases" },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const initials = (user?.name || "C").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  const Sidebar = () => (
    <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between text-slate-300">
      <div>
        <div className="px-5 py-5 flex items-center gap-3 border-b border-slate-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <HeartHandshake className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold tracking-tight">SAATHI</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Counsellor</div>
          </div>
        </div>

        <div className="p-3 mt-2 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={item.testid}
              className={({ isActive }) => `saathi-nav-link ${isActive ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
          <div className="saathi-nav-link opacity-50 cursor-not-allowed" title="Coming soon">
            <Bell className="h-4 w-4" />
            Alerts
            <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 rounded px-1.5 py-0.5">Soon</span>
          </div>
          <div className="saathi-nav-link opacity-50 cursor-not-allowed" title="Coming soon">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </div>
          <div className="saathi-nav-link opacity-50 cursor-not-allowed" title="Coming soon">
            <Settings className="h-4 w-4" />
            Settings
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Globe className="h-3.5 w-3.5" />
          <select
            data-testid="lang-select"
            className="bg-transparent text-slate-300 text-xs outline-none cursor-not-allowed"
            disabled
            defaultValue="en"
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </select>
        </div>
        <button
          data-testid="helpline-quick-btn"
          className="w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-all"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          Emergency Helpline
        </button>
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/60">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white truncate">{user?.name}</div>
            <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={() => { logout(); navigate("/"); }}
            className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-700 transition-all"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex"><Sidebar /></div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 flex"><Sidebar /></div>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Privacy top bar */}
        <div className="bg-indigo-950 text-indigo-100 px-4 lg:px-8 py-2 text-xs flex items-center justify-between border-b border-indigo-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Alias-only • Encrypted • Trauma-informed workspace</span>
            <span className="sm:hidden">Confidential</span>
          </div>
          <div className="text-indigo-300/80">Prototype build</div>
        </div>

        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <button data-testid="open-drawer-btn" onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="font-bold tracking-tight text-slate-900">SAATHI</div>
          <div className="w-9" />
        </div>

        <div className="flex-1 min-w-0">{children}</div>
      </main>
    </div>
  );
}

