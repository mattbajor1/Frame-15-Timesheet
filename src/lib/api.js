// src/lib/api.js
const BASE = import.meta.env.VITE_API_URL;  // e.g. https://script.google.com/macros/s/XXXXX/exec
const KEY  = import.meta.env.VITE_API_KEY;  // must match Settings!B1 in your Sheet

function getEmail() {
  try { return JSON.parse(localStorage.getItem("f15:user") || "{}").email || ""; }
  catch { return ""; }
}

function withKeyURL(extraParams = {}) {
  const u = new URL(BASE);
  u.searchParams.set("key", KEY);
  const email = getEmail();
  if (email) u.searchParams.set("email", email); // <-- include email on GETs
  for (const [k, v] of Object.entries(extraParams)) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v);
  }
  return u.toString();
}

// Encode as form-urlencoded so POST stays a "simple request" (no CORS preflight)
function encForm(obj) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    sp.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  return sp.toString();
}

async function GET(action, params = {}) {
  const url = withKeyURL({ ...params, action });
  const res = await fetch(url, { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || res.statusText || "Request failed");
  }
  return data;
}

async function POST(action, body = {}) {
  const url = withKeyURL(); // key + email in URL too
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: encForm({ action, key: KEY, email: getEmail(), ...body }), // also in body
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || res.statusText || "Request failed");
  }
  return data;
}

export const api = {
  // auth
  whoami: (email) => GET("whoami", { email }),

  // lists & metadata (protected -> email added automatically)
  lists: () => GET("lists"),
  nextProjectNumber: () => GET("nextProjectNumber"),
  summary: (email) => GET("summary", { email }),
  activeTimer: (email) => GET("activeTimer", { email }),

  // projects
  addProject: (payload) => POST("addProject", payload),
  updateProject: (payload) => POST("updateProject", payload),

  // tasks
  addTask: (payload) => POST("addTask", payload),

  // time & reports
  punch: (payload) => POST("punch", payload),
  timelog: (params) => GET("timelog", params),
  report: (params) => GET("report", params),

  // health
  ping: () => GET("ping"),
};
