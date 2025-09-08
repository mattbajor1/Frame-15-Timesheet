// src/lib/api.js
const BASE = import.meta.env.VITE_API_URL ?? "";
const KEY  = import.meta.env.VITE_API_KEY ?? "";

const TIMEOUT_MS = 12000;

function getEmail() {
  try {
    const raw = localStorage.getItem("f15:user");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return u?.email || "";
  } catch {
    return "";
  }
}

function urlWith(params = {}) {
  const u = new URL(BASE);
  u.searchParams.set("key", KEY);
  const email = getEmail();
  if (email) u.searchParams.set("email", email);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v);
  }
  return u.toString();
}

async function fetchJSON(url, options = {}) {
  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: ac.signal });
    const text = await res.text();

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { ok: false, error: text || "Invalid JSON" };
    }

    if (!res.ok || data.ok === false) {
      const msg = data?.error || `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return data;
  } finally {
    clearTimeout(to);
  }
}

function encForm(obj) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    sp.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  return sp.toString();
}

async function GET(action, params = {}) {
  const url = urlWith({ ...params, action });
  return fetchJSON(url, { method: "GET" });
}

async function POST(action, body = {}) {
  const url = urlWith();
  return fetchJSON(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: encForm({ action, key: KEY, email: getEmail(), ...body }),
  });
}

async function MUTATE(action, payload = {}) {
  try {
    return await POST(action, payload);
  } catch {
    return await GET(action, { ...payload, action });
  }
}

const cache = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* empty */ } },
};

export const api = {
  whoami: (email) => GET("whoami", { email }),
  version: () => GET("version"),
  actions: () => GET("actions"),

  lists: async () => {
    const data = await GET("lists");
    cache.set("f15:lists", data);
    return data;
  },
  listsCached: () => cache.get("f15:lists"),

  users: () => GET("users"),
  nextProjectNumber: () => GET("nextProjectNumber"),

  // shifts/work
  activeShift: () => GET("activeShift"),
  shiftSummary: (email) => GET("shiftSummary", { email }),
  startShift: () => MUTATE("startShift"),
  stopShift: () => MUTATE("stopShift"),

  // project details
  projectDetails: async (projectNumber) => {
    const data = await GET("projectDetails", { projectNumber });
    cache.set(`f15:project:${projectNumber}`, data);
    return data;
  },
  projectDetailsCached: (projectNumber) => cache.get(`f15:project:${projectNumber}`),

  // projects & tasks
  addProject: (payload) => MUTATE("addProject", payload),
  updateProject: (payload) => MUTATE("updateProject", payload),
  addTask: (payload) => MUTATE("addTask", payload),
  updateTask: (payload) => MUTATE("updateTask", payload),

  // insights
  timelog: (params) => GET("timelog", params),
  report: (params) => GET("report", params),

  ping: () => GET("ping"),
};
