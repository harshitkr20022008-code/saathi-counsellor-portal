import axios from "axios";

// Render's `fromService: host` resolves to a bare hostname (e.g.
// "saathi-api.onrender.com") with no protocol, so normalise whatever we get.
function normaliseBaseUrl(raw) {
  const value = (raw || "").trim();
  if (!value) return "http://localhost:8000";
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

export const BACKEND_URL = normaliseBaseUrl(import.meta.env.VITE_API_URL);
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("saathi_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/" && path !== "/victim") {
        localStorage.removeItem("saathi_token");
        localStorage.removeItem("saathi_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export function formatApiError(err) {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return err?.message || "Something went wrong";
}

