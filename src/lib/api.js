// src/lib/api.js
const BASE = import.meta.env.VITE_API_URL;
const KEY  = import.meta.env.VITE_API_KEY;

function email() {
  try {
    const u = JSON.parse(localStorage.getItem("f15:user") || "{}");
    return u?.email || "";
  } catch { return ""; }
}

function q(params) {
  const u = new URLSearchParams(params);
  return u.toString();
}

async function get(action, params = {}) {
  const url = `${BASE}?${q({ action, key: KEY, email: email(), ...params })}`;
  const r = await fetch(url, { method: "GET" });
  const j = await r.json();
  if (!r.ok || j.ok === false) throw new Error(j.error || r.statusText);
  return j;
}
async function post(action, body = {}) {
  const r = await fetch(`${BASE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, key: KEY, email: email(), ...body }),
  });
  const j = await r.json();
  if (!r.ok || j.ok === false) throw new Error(j.error || r.statusText);
  return j;
}

/* cache */
const CACHE_KEY = "f15:lists";
export const api = {
  listsCached() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch { return null; }
  },
  async lists() {
    const j = await get("lists");
    localStorage.setItem(CACHE_KEY, JSON.stringify(j));
    return j;
  },
  async nextProjectNumber() { return await get("nextprojectnumber"); },
  async projectDetails(projectNumber) { return await get("projectdetails", { projectNumber }); },

  async addProject(p) { return await post("addproject", p); },
  async updateProject(p) { return await post("updateproject", p); },

  async addTask(t) { return await post("addtask", t); },
  async updateTask(t) { return await post("updatetask", t); },

  async shiftSummary(emailAddr) { return await get("shiftsummary", { email: emailAddr || email() }); },
  async startShift() { return await post("startshift"); },
  async stopShift() { return await post("stopshift"); },

  // NEW: task timers
  async timers() { const j = await get("timers"); return j.timers || []; },
  async timeLog(limit = 20) { const j = await get("timelog", { limit }); return j.logs || []; },
  async startTimer({ projectNumber = "", taskName = "", label = "", billable = false } = {}) {
    return await post("starttimer", { projectNumber, taskName, label, billable });
  },
  async stopTimer(id) { return await post("stoptimer", { id }); },
};
