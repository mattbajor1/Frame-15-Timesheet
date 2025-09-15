// src/lib/api.js
const BASE = import.meta.env.VITE_API_URL;
const KEY  = import.meta.env.VITE_API_KEY;

function getEmail() {
  try {
    const u = JSON.parse(localStorage.getItem("f15:user") || "{}");
    return u?.email || "";
  } catch { return ""; }
}

function qs(params) {
  const u = new URLSearchParams(params);
  return u.toString();
}

async function httpGet(action, params={}){
  const email = params.email || getEmail();
  const url = `${BASE}?${qs({action, key:KEY, email, ...params})}`;
  const r = await fetch(url, { method:"GET", credentials:"omit" });
  if(!r.ok) throw new Error(`GET ${action} ${r.status}`);
  const j = await r.json();
  if(j.ok===false) throw new Error(j.error || `GET ${action} failed`);
  return j;
}

async function httpPost(action, body={}){
  const email = body.email || getEmail();
  const form = new URLSearchParams({ action, key:KEY, email, ...body });
  const r = await fetch(BASE, {
    method:"POST",
    headers: { "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8" }, // avoids CORS preflight
    body: form.toString(),
    credentials:"omit"
  });
  if(!r.ok) throw new Error(`POST ${action} ${r.status}`);
  const j = await r.json();
  if(j.ok===false) throw new Error(j.error || `POST ${action} failed`);
  return j;
}

export const api = {
  async ping(){ try{ const j = await httpGet("ping"); return j; }catch(e){ return {ok:false, error:String(e.message||e)}; } },
  async version(){ return await httpGet("version"); },
  async whoami(email){ return await httpGet("whoami", { email: email || getEmail() }); },

  async lists(){ return await httpGet("lists"); },
  async users(){ const j = await httpGet("users"); return j.users || []; },
  async nextProjectNumber(){ return await httpGet("nextprojectnumber"); },
  async projectDetails(projectNumber){ return await httpGet("projectdetails", { projectNumber }); },

  async addProject(p){ return await httpPost("addproject", p); },
  async updateProject(p){ return await httpPost("updateproject", p); },

  async addTask(t){ return await httpPost("addtask", t); },
  async updateTask(t){ return await httpPost("updatetask", t); },

  async shiftSummary(email){ return await httpGet("shiftsummary", { email: email || getEmail() }); },
  async startShift(){ return await httpPost("startshift"); },
  async stopShift(){ return await httpPost("stopshift"); },

  async timers(){ const j = await httpGet("timers"); return j.timers || []; },
  async timeLog(limit=20){ const j = await httpGet("timelog", { limit }); return j.logs || []; },
  async startTimer({ projectNumber="", taskName="", label="", billable=false, color="" } = {}){
    return await httpPost("starttimer", { projectNumber, taskName, label, billable, color });
  },
  async stopTimer(id){ return await httpPost("stoptimer", { id }); },

  // Inventory
  async listInventory(){ return await httpGet("listinventory"); },
  async addInventory(item){ return await httpPost("addinventory", item); },
  async updateInventory(item){ return await httpPost("updateinventory", item); },
  async projectEquipment(projectNumber){ return await httpGet("projectequipment", { projectNumber }); },
  async assignEquipment(o){ return await httpPost("assignequipment", o); },
  async removeEquipment(id){ return await httpPost("removeequipment", { id }); },

  // Invoices
  async buildInvoice(projectNumber){ return await httpGet("buildinvoice", { projectNumber }); },
  async saveInvoice(projectNumber){ return await httpPost("saveinvoice", { projectNumber }); },
  async listInvoices(projectNumber){ return await httpGet("listinvoices", { projectNumber }); },
  async invoice(invoiceId){ return await httpGet("invoice", { invoiceId }); },
};
