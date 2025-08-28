import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

function useLocal(key, initial) {
  const [v, setV] = useState(() => {
    try { const x = localStorage.getItem(key); return x ? JSON.parse(x) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* empty */ } }, [key, v]);
  return [v, setV];
}

function Elapsed({ startISO }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (!startISO) return <span className="font-mono">00:00:00</span>;
  const diff = Math.max(0, Math.floor((now - new Date(startISO).getTime()) / 1000));
  const h = String(Math.floor(diff / 3600)).padStart(2, "0");
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
  const s = String(diff % 60).padStart(2, "0");
  return <span className="font-mono text-3xl">{h}:{m}:{s}</span>;
}

export default function Work({ email }) {
  const [lists, setLists] = useState({ projects: [], tasks: [] });
  const [active, setActive] = useState(null);
  const [weekHours, setWeekHours] = useState(null);
  const [loading, setLoading] = useState(false);

  const [sel, setSel] = useLocal("f15:last", { projectNumber: "", taskName: "", billable: true });

  useEffect(() => { (async () => {
    const r = await api.lists();
    setLists(r);
  })(); }, []);

  const taskOptions = useMemo(() =>
    lists.tasks.filter(t => !sel.projectNumber || t.projectNumber === sel.projectNumber), [lists.tasks, sel.projectNumber]
  );

  const refresh = useCallback(async () => {
    if (!email) return;
    const [sum, act] = await Promise.all([api.summary(email), api.activeTimer(email)]);
    setWeekHours(sum.totalHours ?? null);
    setActive(act.active ?? null);
  }, [email]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handlePunch() {
    if (!email) { alert("Enter your email in the top bar."); return; }
    setLoading(true);
    try {
      const r = await api.punch({ email, projectNumber: sel.projectNumber, taskName: sel.taskName, billable: sel.billable });
      if (r.mode === "clockin") setActive({ inISO: r.inISO, projectNumber: sel.projectNumber, taskName: sel.taskName });
      else setActive(null);
      await refresh();
    } finally { setLoading(false); }
  }

  async function quickAddTask() {
    if (!sel.projectNumber || !sel.taskName) return;
    try {
      await api.addTask({ projectNumber: sel.projectNumber, taskName: sel.taskName, progress: 0, status: "Backlog" });
      const r = await api.lists();
      setLists(r);
      alert("Task added.");
    } catch (e) {
      alert(String(e.message || e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="f15-card flex items-center justify-between">
        <div>
          <div className="f15-h1">Work</div>
          <div className="text-sm text-neutral-600">Week: {weekHours ?? "--"}h</div>
        </div>
        <div className="text-right">
          <Elapsed startISO={active?.inISO} />
          <div className="text-sm text-neutral-600">{active ? "Active" : "Idle"}</div>
        </div>
      </div>

      <div className="f15-card f15-grid f15-grid-2">
        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium">Project</label>
            <select className="f15-select mt-1" value={sel.projectNumber}
              onChange={(e) => setSel(s => ({ ...s, projectNumber: e.target.value }))}>
              <option value="">— Select project —</option>
              {lists.projects.map(p => <option key={p.number} value={p.number}>{p.number} — {p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Task</label>
            <select className="f15-select mt-1" value={sel.taskName}
              onChange={(e) => setSel(s => ({ ...s, taskName: e.target.value }))}>
              <option value="">— Select task —</option>
              {taskOptions.map(t => <option key={t.id} value={t.name}>{t.name} ({t.id})</option>)}
            </select>
            <div className="text-xs text-neutral-500 mt-1">Type a new task name and click “Quick add” to create it.</div>
          </div>

          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={sel.billable} onChange={(e) => setSel(s => ({ ...s, billable: e.target.checked }))} />
            Billable
          </label>
        </div>

        <div className="flex flex-col justify-center items-center gap-3">
          <button className="f15-cta" onClick={handlePunch} disabled={loading}>
            {active ? "Stop" : "Start"}
          </button>
          <div className="flex gap-2">
            <button className="f15-btn f15-btn--blue" onClick={quickAddTask} disabled={!sel.projectNumber || !sel.taskName}>Quick add task</button>
            <button className="f15-btn f15-btn--danger" onClick={() => setSel({ projectNumber: "", taskName: "", billable: true })}>Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
}
