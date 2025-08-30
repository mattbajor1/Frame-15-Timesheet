const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

function currentUser() {
  try { return JSON.parse(localStorage.getItem("f15:user") || "{}"); }
  catch { return {}; }
}
function currentEmail() { return currentUser().email || ""; }
function currentIdToken() { return currentUser().idToken || ""; }

async function getJSON(url) {
  try {
    const r = await fetch(url, { method: "GET" });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const j = await r.json();
    if (j && j.ok === false && j.error) throw new Error(j.error);
    return j;
  } catch (e) {
    throw new Error(`GET ${url}: ${e.message || e}`);
  }
}

async function postJSON(body) {
  try {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    const j = await r.json();
    if (j && j.ok === false && j.error) throw new Error(j.error);
    return j;
  } catch (e) {
    throw new Error(`POST ${API_URL}: ${e.message || e}`);
  }
}

export async function apiGet(params = {}) {
  const url = new URL(API_URL);
  const email = params.email ?? currentEmail();
  const idToken = params.idToken ?? currentIdToken();
  Object.entries({ key: API_KEY, email, idToken, ...params }).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  return getJSON(url.toString());
}

export async function apiPost(body = {}) {
  const email = body.email ?? currentEmail();
  const idToken = body.idToken ?? currentIdToken();
  return postJSON({ key: API_KEY, email, idToken, ...body });
}

export const api = {
  // meta
  ping: () => apiGet({ action: "ping" }),
  whoami: () => apiGet({ action: "whoami" }),

  // lists & reports
  lists: (opts = {}) => apiGet({ action: "lists", ...opts }),
  report: (q = {}) => apiGet({ action: "report", ...q }),
  timelog: (q = {}) => apiGet({ action: "timelog", ...q }),
  nextProjectNumber: () => apiGet({ action: "nextProjectNumber" }),

  // timers
  summary: (email) => apiGet({ action: "summary", email }),
  activeTimer: (email) => apiGet({ action: "activeTimer", email }),
  punch: (payload) => apiPost({ action: "punch", ...payload }),

  // projects/tasks
  addProject: (p) => apiPost({ action: "addProject", ...p }),
  updateProject: (p) => apiPost({ action: "updateProject", ...p }),
  addTask: (t) => apiPost({ action: "addTask", ...t }),
  updateTask: (t) => apiPost({ action: "updateTask", ...t }),

  // admin
  lockPastWeeks: () => apiPost({ action: "lockPastWeeks" }),
  truncate: (tables) => apiPost({ action: "truncate", tables }),
};
