// src/pages/Work.jsx
import { useEffect, useState, useCallback } from "react";
import { useShift } from "../contexts/ShiftContext.js";
import { api } from "../lib/api";
import { useToast } from "../components/ToastContext.js";

export default function Work() {
  const { active: shiftActive, today, week, start: startShift, stop: stopShift } = useShift();
  const t = useToast();
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ projectNumber: "", taskName: "", label: "", billable: false });
  const [timers, setTimers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingTimers, setLoadingTimers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const tick = useNow(1000);

  useEffect(() => {
    const cached = api.listsCached();
    if (cached?.projects) setProjects(cached.projects);
    (async () => {
      const l = await api.lists();
      setProjects(l.projects || []);
    })();
    refreshTimers();
    refreshLogs();
  }, [refreshTimers, refreshLogs]);


  const refreshTimers = useCallback(async () => {
    setLoadingTimers(true);
    try { setTimers(await api.timers()); } catch (e) { t.show(String(e?.message || e), "error"); }
    finally { setLoadingTimers(false); }
  }, [t]);

  const refreshLogs = useCallback(async () => {
    setLoadingLogs(true);
    try { setLogs(await api.timeLog(20)); } catch (e) { t.show(String(e?.message || e), "error"); }
    finally { setLoadingLogs(false); }
  }, [t]);

  async function startTimer() {
    if (!form.taskName && !form.label) { t.show("Enter a task name (or label).", "error"); return; }
    try {
      await api.startTimer(form);
      t.show("Timer started", "success");
      setForm(f => ({ ...f, taskName: "", label: "" }));
      await refreshTimers();
    } catch (e) {
      t.show(`Start failed: ${e?.message || e}`, "error", 4000);
    }
  }
  async function stopTimer(id) {
    try {
      await api.stopTimer(id);
      t.show("Timer saved", "success");
      await Promise.all([refreshTimers(), refreshLogs()]);
    } catch (e) {
      t.show(`Stop failed: ${e?.message || e}`, "error", 4000);
    }
  }

  const fmtH = (m) => (m < 15 ? `${m} min` : `${(m/60).toFixed(2)} h`);
  const elapsedMins = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

  return (
    <div className="space-y-6">
      {/* Shift card */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="text-xl font-semibold mb-2">Your shift</div>
        {shiftActive ? (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-400">Clocked in since</div>
            <div className="text-lg">{new Date(shiftActive.inISO).toLocaleTimeString()}</div>
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={stopShift}>Clock out</button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-400">Not on the clock</div>
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={startShift}>Clock in</button>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-xl p-4" style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
            <div className="text-xs text-gray-400">Today</div>
            <div className="text-2xl font-bold">{today < 0.25 ? `${Math.round(today*60)} min` : `${today.toFixed(2)} h`}</div>
          </div>
          <div className="rounded-xl p-4" style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
            <div className="text-xs text-gray-400">This week</div>
            <div className="text-2xl font-bold">{week < 0.25 ? `${Math.round(week*60)} min` : `${week.toFixed(2)} h`}</div>
          </div>
        </div>
      </div>

      {/* Start a task timer */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="text-xl font-semibold mb-3">Task timers</div>
        <div className="grid md:grid-cols-4 gap-3">
          <select className="rounded-xl px-3 py-2 border bg-transparent" style={{ borderColor: "var(--line)" }}
                  value={form.projectNumber} onChange={e=>setForm(f=>({ ...f, projectNumber:e.target.value }))}>
            <option value="">Select project (optional)</option>
            {projects.map(p => <option key={p.number} value={p.number}>{p.number} — {p.name}</option>)}
          </select>
          <input className="rounded-xl px-3 py-2 border bg-transparent md:col-span-2" style={{ borderColor: "var(--line)" }}
                 placeholder="Task name" value={form.taskName} onChange={e=>setForm(f=>({ ...f, taskName:e.target.value }))}/>
          <input className="rounded-xl px-3 py-2 border bg-transparent" style={{ borderColor: "var(--line)" }}
                 placeholder="Label (optional)" value={form.label} onChange={e=>setForm(f=>({ ...f, label:e.target.value }))}/>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={form.billable} onChange={e=>setForm(f=>({ ...f, billable:e.target.checked }))}/>
            Billable
          </label>
          <div className="flex-1" />
          <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={startTimer}>Start timer</button>
        </div>
      </div>

      {/* Active timers */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">Active</div>
          <button className="px-3 py-1.5 rounded-lg hover:bg-white/10" onClick={refreshTimers}>Refresh</button>
        </div>
        {loadingTimers ? (
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            {Array.from({length:4}).map((_,i)=><div key={i} className="h-16 rounded-xl animate-pulse" style={{background:"var(--surface-2)", border:"1px solid var(--line)"}} />)}
          </div>
        ) : timers.length===0 ? (
          <div className="text-gray-400 text-sm mt-2">No active timers.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            {timers.map(tm => {
              const mins = elapsedMins(tm.inISO); // re-computed every tick
              tick; // re-render each second
              return (
                <div key={tm.id} className="rounded-xl p-4 flex items-center justify-between"
                     style={{ border:"1px solid var(--line)", background:"var(--surface-2)" }}>
                  <div>
                    <div className="text-sm font-semibold">{tm.label || tm.taskName || "(Timer)"}</div>
                    <div className="text-xs text-gray-400">
                      {tm.projectNumber ? `${tm.projectNumber} · ` : ""}{new Date(tm.inISO).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono opacity-90">{fmtH(mins)}</div>
                    <button className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold" onClick={()=>stopTimer(tm.id)}>Stop</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">Recent entries</div>
          <button className="px-3 py-1.5 rounded-lg hover:bg-white/10" onClick={refreshLogs}>Refresh</button>
        </div>
        {loadingLogs ? (
          <div className="space-y-2 mt-3">
            {Array.from({length:6}).map((_,i)=><div key={i} className="h-12 rounded-xl animate-pulse" style={{background:"var(--surface-2)", border:"1px solid var(--line)"}} />)}
          </div>
        ) : logs.length===0 ? (
          <div className="text-gray-400 text-sm mt-2">No entries yet.</div>
        ) : (
          <div className="space-y-2 mt-3">
            {logs.map(l => (
              <div key={l.id} className="rounded-xl p-3 flex items-center justify-between"
                   style={{ border:"1px solid var(--line)", background:"var(--surface-2)" }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.projectNumber ? `${l.projectNumber} — ` : ""}{l.task || "(Entry)"}</div>
                  <div className="text-xs text-gray-400">{new Date(l.inISO).toLocaleString()} → {new Date(l.outISO).toLocaleTimeString()}</div>
                </div>
                <div className="text-sm font-semibold">{fmtH(l.minutes)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function useNow(ms=1000){
  const [, setTick] = useState(0);
  useEffect(() => { const id=setInterval(()=>setTick(x=>x+1), ms); return ()=>clearInterval(id); }, [ms]);
  return 0;
}
