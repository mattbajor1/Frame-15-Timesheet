// src/pages/Home.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const GREETINGS = [
  "Let's build something great today.",
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

  useEffect(() => {
    setGreet(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  }, []);

  const refresh = useCallback(async () => {
    if (!email) return;
    setErr("");
    try {
      const [s, l] = await Promise.all([api.shiftSummary(email), api.lists()]);
      setSummary(s);
      setData({ projects: l.projects || [], tasks: l.tasks || [], users: l.users || [] });
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }, [email]);

  useEffect(() => {
    if (email) refresh();
  }, [email, refresh]);

  const upcoming = useMemo(() => {
    const arr = (data.tasks || [])
      .filter((t) => t.dueISO)
      .slice()
      .sort((a, b) => (a.dueISO > b.dueISO ? 1 : -1));
    return arr.slice(0, 6);
  }, [data.tasks]);

  async function start() {
    setBusy(true);
    setErr("");
    try {
      await api.startShift();
      await refresh();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setErr("");
    try {
      await api.stopShift();
      await refresh();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="f15-card">
        <div className="f15-h2">Welcome back</div>
        <div className="mt-1 text-neutral-400">{greet}</div>
      </div>

      {/* Key stats & quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="f15-card">
          <div className="text-sm text-neutral-400">Today</div>
          <div className="text-3xl font-bold">{summary.todayHours.toFixed(2)} h</div>
        </div>
        <div className="f15-card">
          <div className="text-sm text-neutral-400">This week</div>
          <div className="text-3xl font-bold">{summary.weekHours.toFixed(2)} h</div>
        </div>
        <div className="f15-card">
          <div className="text-sm text-neutral-400 mb-2">Shift</div>
          {summary.active ? (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                Clocked in since <b>{new Date(summary.active.inISO).toLocaleTimeString()}</b>
              </div>
              <button className="f15-btn f15-btn--danger" onClick={stop} disabled={busy}>
                Clock out
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm">Not on the clock</div>
              <button className="f15-btn f15-btn--blue" onClick={start} disabled={busy}>
                Clock in
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Projects overview */}
      <div className="f15-card">
        <div className="flex items-center justify-between">
          <div className="f15-h2">Active projects</div>
          <button className="f15-btn" onClick={() => setPage("projects")}>
            Open Projects →
          </button>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {data.projects.slice(0, 6).map((p) => (
            <div key={p.number} className="f15-tile">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{p.number}</div>
                <span className="text-xs px-2 py-1 rounded-full border">{p.status}</span>
              </div>
              <div className="text-sm mt-1">{p.name}</div>
              <div className="text-xs text-neutral-400">{p.client || "—"}</div>
            </div>
          ))}
          {data.projects.length === 0 && <div className="text-neutral-400">No projects yet.</div>}
        </div>
      </div>

      {/* Upcoming due */}
      <div className="f15-card">
        <div className="f15-h2 mb-2">Upcoming due</div>
        {upcoming.length === 0 ? (
          <div className="text-neutral-400 text-sm">No upcoming task due dates.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcoming.map((t) => (
              <div key={t.id} className="f15-tile">
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-neutral-400 mt-1">{t.projectNumber}</div>
                <div className="text-xs mt-2">
                  Due: <b>{new Date(t.dueISO).toLocaleDateString()}</b>
                </div>
                <div className="text-xs text-neutral-400 mt-1">{t.assignee || "Unassigned"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {err && <div className="text-red-500 text-sm">{err}</div>}
    </div>
  );
}
