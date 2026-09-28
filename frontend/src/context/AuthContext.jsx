import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("saathi_token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("saathi_user") || "null"); } catch { return null; }
  });
  const [ready, setReady] = useState(false);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("saathi_token", data.access_token);
    localStorage.setItem("saathi_user", JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("saathi_token");
    localStorage.removeItem("saathi_user");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      const t = localStorage.getItem("saathi_token");
      if (!t) { setReady(true); return; }
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
        localStorage.setItem("saathi_user", JSON.stringify(data));
      } catch {
        localStorage.removeItem("saathi_token");
        localStorage.removeItem("saathi_user");
        setToken(null);
        setUser(null);
      } finally {
        setReady(true);
      }
    }
    bootstrap();
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
