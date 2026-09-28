import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import VictimPlaceholder from "@/pages/VictimPlaceholder";
import Dashboard from "@/pages/Dashboard";
import CasesList from "@/pages/CasesList";
import CaseDetail from "@/pages/CaseDetail";

function Protected({ children }) {
  const { token, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Loading…
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function Shell({ children }) {
  return (
    <Protected>
      <AppLayout>{children}</AppLayout>
    </Protected>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/victim" element={<VictimPlaceholder />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Shell><Dashboard /></Shell>} />
      <Route path="/cases" element={<Shell><CasesList /></Shell>} />
      <Route path="/cases/:id" element={<Shell><CaseDetail /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
