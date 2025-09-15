// src/lib/api.js

// ===== Env =====
const BASE = import.meta.env.VITE_API_URL;
const KEY  = import.meta.env.VITE_API_KEY;

// Optional: pull saved user email for endpoints that default to current user
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
  } catch {
    // intentionally ignore cache set errors
  }
}

// ===== HTTP helpers =====
async function httpGet(action, params = {}) {
  assertEnv();
  const q = qs({ action, key: KEY, ...params });
  const r = await fetch(`${BASE}?${q}`, { method: "GET", credentials: "omit" });
  if (!r.ok) throw new Error(`GET ${action} ${r.status}`);
  const j = await r.json().catch(() => ({}));
  if (j?.ok === false) throw new Error(j.error || `GET ${action} failed`);
  return j;
}

async function httpPost(action, body = {}) {
  assertEnv();
  const form = new URLSearchParams({ action, key: KEY, ...body });
  const r = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: form.toString(),
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
    try { listsCacheSet(j); } catch { /* ignore cache errors */ }
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
  async activeTimer() { return await httpGet("activetimer"); },
  async startTimer(o) { return await httpPost("starttimer", o); },   // expect: { projectNumber, task, billable, label? }
  async stopTimer(o) { return await httpPost("stoptimer", o); },     // expect: { id } or {} for active
  async timeLog(params = {}) { return await httpGet("timelog", params); }, // e.g., { weekStart: 'YYYY-MM-DD', email? }

  // Dashboards / Analytics
  async summary(params = {}) { return await httpGet("summary", params); }, // e.g., { weekStart }
  async report(params = {}) { return await httpGet("report", params); },   // arbitrary filters
  async punch(o = {}) { return await httpPost("punch", o); },              // if used by dashboard
  async startShift(o = {}) { return await httpPost("startshift", o); },
  async stopShift(o = {}) { return await httpPost("stopshift", o); },
  async shiftSummary(params = {}) { return await httpGet("shiftsummary", params); },

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
