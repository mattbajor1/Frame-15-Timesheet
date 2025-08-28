const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

export async function apiGet(params = {}) {
  const url = new URL(API_URL);
  Object.entries({ key: API_KEY, ...params }).forEach(([k, v]) =>
    url.searchParams.set(k, v)
  );
  const r = await fetch(url.toString(), { method: "GET" });
  if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
  return r.json();
}

export async function apiPost(body = {}) {
  // If you ever hit CORS preflight issues, change Content-Type to 'text/plain'
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: API_KEY, ...body }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`POST ${API_URL} → ${r.status}: ${t}`);
  }
  return r.json();
}

// Convenience wrappers
export const api = {
  ping: () => apiGet({ action: "ping" }),
  lists: (opts = {}) => apiGet({ action: "lists", ...opts }),
  summary: (email) => apiGet({ action: "summary", email }),
  activeTimer: (email) => apiGet({ action: "activeTimer", email }),
  punch: (payload) => apiPost({ action: "punch", ...payload }),
  addProject: (p) => apiPost({ action: "addProject", ...p }),
  addTask: (t) => apiPost({ action: "addTask", ...t }),
  lockPastWeeks: () => apiPost({ action: "lockPastWeeks" }),
  truncate: (tables) => apiPost({ action: "truncate", tables }),
  updateProject: (p) => apiPost({ action: "updateProject", ...p }),
  updateTask: (t) => apiPost({ action: "updateTask", ...t }),
  report: (query={}) => apiGet({ action: "report", ...query }),
  timelog: (query={}) => apiGet({ action: "timelog", ...query }),
};
