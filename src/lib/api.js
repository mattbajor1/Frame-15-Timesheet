// src/lib/api.js
const BASE = import.meta.env.VITE_API_URL;
const KEY  = import.meta.env.VITE_API_KEY;

const TIMEOUT_MS = 12000;

function getEmail() {
  try { return JSON.parse(localStorage.getItem("f15:user") || "{}").email || ""; }
  catch { return ""; }
}
function withKeyURL(extraParams = {}) {
  const u = new URL(BASE);
  u.searchParams.set("key", KEY);
  const email = getEmail();
  if (email) u.searchParams.set("email", email);
  for (const [k, v] of Object.entries(extraParams)) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v);
  }
  return u.toString();
}

async function fetchJSON(url, options = {}) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: ac.signal });
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { ok:false, error: text || "Invalid JSON" }; }
    if (!res.ok || data.ok === false) {
      const msg = data.error || `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return data;
  } finally {
    clearTimeout(id);
  }
}

function encForm(obj) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) sp.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  return sp.toString();
}

async function GET(action, params = {}) {
  const url = withKeyURL({ ...params, action });
  return fetchJSON(url, { method: "GET" });
}
async function POST(action, body = {}) {
  const url = withKeyURL();
  return fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: encForm({ action, key: KEY, email: getEmail(), ...body }),
  });
}

// super-light local caches for perceived speed
const cache = {
  get(k){ try { return JSON.parse(localStorage.getItem(k)||"null"); } catch { return null; } },
  set(k,v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* empty */ } }
};

export const api = {
  // auth
  whoami: (email) => GET("whoami", { email }),
  version: () => GET("version"),
  actions: () => GET("actions"),

  // lists & metadata
  lists: async () => {
    const data = await GET("lists");
    cache.set("f15:lists", data);
    return data;
  },
  listsCached: () => cache.get("f15:lists"),

  users: () => GET("users"),
  nextProjectNumber: () => GET("nextProjectNumber"),

  // shifts
  activeShift: () => GET("activeShift"),
  shiftSummary: (email) => GET("shiftSummary", { email }),
  startShift: () => POST("startShift"),
  stopShift: () => POST("stopShift"),

  // projects
  projectDetails: async (projectNumber) => {
    const data = await GET("projectDetails", { projectNumber });
    cache.set(`f15:project:${projectNumber}`, data);
    return data;
  },
  projectDetailsCached: (projectNumber) => cache.get(`f15:project:${projectNumber}`),

  addProject: (payload) => POST("addProject", payload),
  updateProject: (payload) => POST("updateProject", payload),

  // tasks
  addTask: (payload) => POST("addTask", payload),
  updateTask: (payload) => POST("updateTask", payload),

  // reports
  timelog: (params) => GET("timelog", params),
  report: (params) => GET("report", params),

  // health
  ping: () => GET("ping"),
};
