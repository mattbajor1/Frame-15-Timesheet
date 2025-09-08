// src/pages/Home.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const GREETINGS = [
  "Let’s build something great today.",
  "Small steps, big wins.",
  "Sharp focus. Clean execution.",
  "Create. Iterate. Ship.",
  "Stay curious. Stay kind.",
];

export default function Home({ email, setPage }) {
  const [greet, setGreet] = useState("");
  const [summary, setSummary] = useState({ todayHours: 0, weekHours: 0, active: null });
  const [data, setData] = useState({ projects: [], tasks: [], users: [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // greeting
  useEffect(() => { setGreet(GREETINGS[Math.floor(Math.random()*GREETINGS.length)]); }, []);

  // show cached lists immediately
  useEffect(() => {
    const cached = api.listsCached();
    if (cached) setData({ projects: cached.projects||[], tasks: cached.tasks||[], users: cached.users||[] });
  }, []);

  const refresh = useCallback(async () => {
    if (!email) return;
    setErr("");
    setLoading(true);
    try {
      const [s, l] = await Promise.all([api.shiftSummary(email), api.lists()]);
      setSummary(s);
      setData({ projects: l.projects || [], tasks: l.tasks || [], users: l.users || [] });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally { setLoading(false); }
  }, [email]);

  useEffect(() => { if (email) refresh(); }, [email, refresh]);

  const upcoming = useMemo(() => {
    const arr = (data.tasks || []).filter(t => t.dueISO).slice().sort((a,b) => (a.dueISO > b.dueISO ? 1 : -1));
    return arr.slice(0, 6);
  }, [data.tasks]);

  // optimistic shift actions
  async function start() {
    if (summary.active) return;
    setBusy(true); setErr("");
    const prev = summary;
    const nowISO = new Date().toISOString();
    setSummary(s => ({ ...s, active: { inISO: nowISO } })); // optimistic
    try { await api.startShift(); await refresh(); }
    catch (e) { setSummary(prev); setErr(String(e?.message||e)); }
    finally { setBusy(false); }
  }

  async function stop() {
    if (!summary.active) return;
    setBusy(true); setErr("");
    const prev = summary;
    try {
      // optimistic: compute a quick delta; real source will correct on refresh
      const inD = new Date(summary.active.inISO);
      const now = new Date();
      const addMin = Math.max(0, Math.round((now - inD)/60000));
      setSummary(s => ({ todayHours: s.todayHours + addMin/60, weekHours: s.weekHours + addMin/60, active: null }));
      await api.stopShift();
      await refresh();
    } catch (e) {
      setSummary(prev);
      setErr(String(e?.message || e));
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="f15-hero">
        <div>
          <div className="text-sm tracking-wide text-blue-600">Frame-15 Internal</div>
          <div className="text-2xl font-bold mt-1">Welcome back</div>
          <div className="text-neutral-500 mt-1">{greet}</div>
        </div>
        <div className="flex items-center gap-2">
          {summary.active ? (
            <button className="f15-btn f15-btn--danger" onClick={stop} disabled={busy}>Clock out</button>
          ) : (
            <button className="f15-btn f15-btn--blue" onClick={start} disabled={busy}>Clock in</button>
          )}
          <button className="f15-btn" onClick={()=>setPage("projects")}>Open Projects →</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="f15-card f15-kpi">
          <div className="text-sm text-neutral-500">Today</div>
          <div className="f15-kpi-value">{summary.todayHours.toFixed(2)} h</div>
        </div>
        <div className="f15-card f15-kpi">
          <div className="text-sm text-neutral-500">This week</div>
          <div className="f15-kpi-value">{summary.weekHours.toFixed(2)} h</div>
        </div>
        <div className="f15-card">
          <div className="text-sm text-neutral-500 mb-1">Shift</div>
          {summary.active ? (
            <div className="flex items-center justify-between">
              <div className="text-sm">Clocked in since <b>{new Date(summary.active.inISO).toLocaleTimeString()}</b></div>
              <span className="f15-badge">Active</span>
            </div>
          ) : (
            <div className="text-sm">Not on the clock</div>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="f15-card">
        <div className="flex items-center justify-between mb-2">
          <div className="f15-h2">Active projects</div>
          <button className="f15-btn" onClick={()=>setPage("projects")}>Manage →</button>
        </div>
        {loading ? (
          <div className="f15-grid f15-grid-3">
            {Array.from({length:6}).map((_,i)=><div className="f15-tile f15-skeleton" key={i} />)}
          </div>
        ) : (
          <div className="f15-grid f15-grid-3">
            {data.projects.slice(0,6).map(p=>(
              <div key={p.number} className="f15-tile">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.number}</div>
                  <span className="f15-badge">{p.status}</span>
                </div>
                <div className="text-sm mt-1">{p.name}</div>
                <div className="text-xs text-neutral-500">{p.client || "—"}</div>
              </div>
            ))}
            {data.projects.length===0 && <div className="text-neutral-500">No projects yet.</div>}
          </div>
        )}
      </div>

      {/* Upcoming */}
      <div className="f15-card">
        <div className="f15-h2 mb-2">Upcoming due</div>
        {loading ? (
          <div className="f15-grid f15-grid-3">{Array.from({length:6}).map((_,i)=><div className="f15-tile f15-skeleton" key={i} />)}</div>
        ) : upcoming.length === 0 ? (
          <div className="text-neutral-500 text-sm">No upcoming task due dates.</div>
        ) : (
          <div className="f15-grid f15-grid-3">
            {upcoming.map(t=>(
              <div key={t.id} className="f15-tile">
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-neutral-500 mt-1">{t.projectNumber}</div>
                <div className="text-xs mt-2">Due: <b>{new Date(t.dueISO).toLocaleDateString()}</b></div>
                <div className="text-xs text-neutral-500 mt-1">{t.assignee || "Unassigned"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {err && <div className="text-red-500 text-sm">{err}</div>}
    </div>
  );
}
