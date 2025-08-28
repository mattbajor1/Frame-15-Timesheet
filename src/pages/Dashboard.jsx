import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import Elapsed from "../components/Elapsed";
import { api } from "../lib/api";

export default function Dashboard({ email, onEmail }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projectNumber, setProjectNumber] = useState("");
  const [taskName, setTaskName] = useState("");
  const [billable, setBillable] = useState(true);
  const [active, setActive] = useState(null);
  const [weekHours, setWeekHours] = useState(null);
  const [loading, setLoading] = useState(false);

  // sync email from localStorage login modal
  useEffect(()=>{
    function handler(e){ onEmail?.(e.detail.email); }
    window.addEventListener("f15:userchange", handler);
    return ()=> window.removeEventListener("f15:userchange", handler);
  },[onEmail]);

  useEffect(()=>{ (async()=>{
    const r = await api.lists();
    setProjects(r.projects||[]);
    setTasks(r.tasks||[]);
  })(); }, []);

  const refreshSummary = useCallback(async ()=>{
    if(!email) return;
    const r = await api.summary(email);
    setWeekHours(r.totalHours ?? null);
  }, [email]);

  const refreshActive = useCallback(async ()=>{
    if(!email){ setActive(null); return; }
    const r = await api.activeTimer(email);
    setActive(r.active ?? null);
  }, [email]);

  useEffect(()=>{ refreshSummary(); refreshActive(); }, [refreshSummary, refreshActive]);

  async function handlePunch(){
    if(!email){ alert("Enter your email (top right)"); return; }
    setLoading(true);
    try{
      const r = await api.punch({ email, projectNumber, taskName, billable });
      if(r.mode==='clockin') setActive({ inISO:r.inISO, projectNumber, taskName });
      else { setActive(null); await refreshSummary(); }
    } finally { setLoading(false); }
  }

  const taskOptions = useMemo(()=>tasks.filter(t => !projectNumber || t.projectNumber===projectNumber), [tasks, projectNumber]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <input
          className="w-[280px] max-w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white outline-none focus:ring-2 focus:ring-neutral-300"
          type="email" placeholder="you@frame15.com" value={email||""}
          onChange={e=>onEmail?.(e.target.value)}
        />
        <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-neutral-300">
          Week: {weekHours ?? "--"}h
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Quick Punch"
          actions={<button className="px-4 py-2 rounded-xl border hover:bg-neutral-50" onClick={handlePunch} disabled={loading}>
            {active ? "Clock Out" : "Clock In"}
          </button>}>
          <div className="grid gap-3">
            <div>
              <label className="text-sm font-medium">Project</label>
              <select className="w-full px-3 py-2 rounded-xl border mt-1"
                value={projectNumber} onChange={e=>setProjectNumber(e.target.value)}>
                <option value="">— Select project —</option>
                {projects.map(p=> <option key={p.number} value={p.number}>{p.number} — {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Task</label>
              <select className="w-full px-3 py-2 rounded-xl border mt-1"
                value={taskName} onChange={e=>setTaskName(e.target.value)}>
                <option value="">— Select task —</option>
                {taskOptions.map(t=> <option key={t.id} value={t.name}>{t.name} ({t.id})</option>)}
              </select>
            </div>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={billable} onChange={e=>setBillable(e.target.checked)} />
              Billable
            </label>
          </div>
        </Card>

        <Card title="Active Timer" actions={active && <Elapsed startISO={active.inISO}/>}>
          {!active ? <div className="text-neutral-500">No active timer. Clock in to begin.</div> :
          <div className="space-y-2">
            <div><span className="font-medium">Project:</span> {active.projectNumber || "—"}</div>
            <div><span className="font-medium">Task:</span> {active.taskName || "—"}</div>
            <div className="text-sm text-neutral-500">Started: {new Date(active.inISO).toLocaleString()}</div>
          </div>}
        </Card>
      </div>
    </div>
  );
}
