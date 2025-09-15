// src/lib/api.js

// ===== Env =====
const BASE = import.meta.env.VITE_API_URL;
const KEY  = import.meta.env.VITE_API_KEY;

// Pull saved user email for endpoints that default to current user
function getEmail() {
  try {
    const u = JSON.parse(localStorage.getItem("f15:user") || "{}");
    return u?.email || "";
  } catch {
    return "";
  }
}

function assertEnv() {
  if (!BASE) throw new Error("Missing VITE_API_URL (Site settings → Build & Deploy → Environment).");
  if (!KEY)  throw new Error("Missing VITE_API_KEY (Site settings → Build & Deploy → Environment).");
}

function qs(params) {
  const u = new URLSearchParams(params);
  return u.toString();
}

// ===== Lists cache (for fast, crash-free UI boot) =====
const LISTS_CACHE_KEY = "f15:lists";

function listsCacheGet() {
  try {
    return JSON.parse(localStorage.getItem(LISTS_CACHE_KEY) || "null");
  } catch {
    return null;
  }
}

function listsCacheSet(value) {
  try {
    localStorage.setItem(LISTS_CACHE_KEY, JSON.stringify(value));
  } catch { /* empty */ }
}

// ===== HTTP helpers (auto-inject email) =====
async function httpGet(action, params = {}) {
  assertEnv();
  const email = params.email ?? getEmail();
  const withEmail = email ? { ...params, email } : params;
  const q = qs({ action, key: KEY, ...withEmail });

  const r = await fetch(`${BASE}?${q}`, { method: "GET", credentials: "omit" });
  if (!r.ok) throw new Error(`GET ${action} ${r.status}`);
  const j = await r.json().catch(() => ({}));
  if (j?.ok === false) throw new Error(j.error || `GET ${action} failed`);
  return j;
}

async function httpPost(action, body = {}) {
  assertEnv();
  // Build a form body that ALWAYS includes action + key, and inject email if not present
  const params = { ...(body || {}) };
  if (!("email" in params)) {
    const email = getEmail();
    if (email) params.email = email;
  }
  params.action = action;
  params.key = KEY;

  const payload = new URLSearchParams(params);

  const r = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: payload.toString(),
    credentials: "omit",
  });
  if (!r.ok) throw new Error(`POST ${action} ${r.status}`);
  const j = await r.json().catch(() => ({}));
  if (j?.ok === false) throw new Error(j.error || `POST ${action} failed`);
  return j;
}

// ===== Public API =====
export const api = {
  // Health / identity
  async ping() {
    try {
      const j = await httpGet("ping");
      return j;
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  },
  async version() { return await httpGet("version"); },
  async whoami(email) { return await httpGet("whoami", { email: email || getEmail() }); },

  // Lists (+ cache)
  listsCached() { return listsCacheGet(); },
  async lists() {
    const j = await httpGet("lists");
    try { listsCacheSet(j); } catch { /* empty */ }
    return j;
  },
  async users() {
    const j = await httpGet("users");
    return j.users || [];
  },

  // Projects
  async nextProjectNumber() { return await httpGet("nextprojectnumber"); },
  async projectDetails(projectNumber) { return await httpGet("projectdetails", { projectNumber }); },
  async addProject(p) { return await httpPost("addproject", p); },
  async updateProject(p) { return await httpPost("updateproject", p); },

  // Tasks
  async addTask(t) { return await httpPost("addtask", t); },
  async updateTask(t) { return await httpPost("updatetask", t); },

  // Timers & Logs (Work / Insights)
  async timers() { return await httpGet("timers"); },
  async activeTimer() { return await httpGet("activetimer"); }, // optional helper
  async startTimer(o) { return await httpPost("starttimer", o); },   // supports { projectNumber, taskName|task|name, billable, label? }
  async stopTimer(o) { return await httpPost("stoptimer", o); },     // expects { id }
  async timeLog(paramsOrLimit = {}) {
    const params = (typeof paramsOrLimit === 'number')
      ? { limit: paramsOrLimit }
      : (paramsOrLimit || {});
    return await httpGet("timelog", params);
  },

  // Shifts / summary
  async startShift(o = {}) { return await httpPost("startshift", o); },
  async stopShift(o = {}) { return await httpPost("stopshift", o); },
  async punch(o = {}) { return await httpPost("punch", o); }, // toggle in/out
  async summary(params = {}) { return await httpGet("summary", params); },   // maps to shiftsummary
  async shiftSummary(params = {}) { return await httpGet("shiftsummary", params); },

  // Analytics / reports
  async report(params = {}) { return await httpGet("report", params); },

  // Inventory
  async listInventory() { return await httpGet("listinventory"); },
  async addInventory(item) { return await httpPost("addinventory", item); },
  async updateInventory(item) { return await httpPost("updateinventory", item); },
  async projectEquipment(projectNumber) { return await httpGet("projectequipment", { projectNumber }); },
  async assignEquipment(o) { return await httpPost("assignequipment", o); },
  async removeEquipment(id) { return await httpPost("removeequipment", { id }); },

  // Invoices
  async buildInvoice(projectNumber) { return await httpGet("buildinvoice", { projectNumber }); },
  async saveInvoice(projectNumber) { return await httpPost("saveinvoice", { projectNumber }); },
  async listInvoices(projectNumber) { return await httpGet("listinvoices", { projectNumber }); },
  async invoice(invoiceId) { return await httpGet("invoice", { invoiceId }); },
};
