import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import { api } from "../lib/api";

const STATUSES = ["Backlog","In Progress","Blocked","Review","Done"];

export default function Tasks() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [proj, setProj] = useState("");
  const [q, setQ] = useState("");

  async function load(){
    const r = await api.lists();
    setProjects(r.projects||[]);
    setTasks(r.tasks||[]);
  }
  useEffect(()=>{ load(); }, []);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    return tasks.filter(t=>{
      if(proj && t.projectNumber!==proj) return false;
      if(!s) return true;
      return `${t.id} ${t.name} ${t.assignee} ${t.status} ${t.tags}`.toLowerCase().includes(s);
    });
  }, [tasks, proj, q]);

  async function updateStatus(id, status){
    await api.updateTask({ id, status });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <select className="border rounded-xl px-3 py-2" value={proj} onChange={e=>setProj(e.target.value)}>
          <option value="">All projects</option>
          {projects.map(p=> <option key={p.number} value={p.number}>{p.number}</option>)}
        </select>
        <input className="border rounded-xl px-3 py-2" placeholder="Search tasks…" value={q} onChange={e=>setQ(e.target.value)} />
      </div>

      <Card title={`Tasks (${filtered.length})`}>
        {filtered.length===0 ? <div className="text-neutral-500">No tasks.</div> :
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(t=>(
            <div key={t.id} className="border rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{t.name}</div>
                <select className="border rounded-lg px-2 py-1 text-sm" value={t.status} onChange={e=>updateStatus(t.id, e.target.value)}>
                  {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="text-xs text-neutral-500 mt-1">{t.id} · {t.projectNumber} · {t.assignee||"unassigned"}</div>
            </div>
          ))}
        </div>}
      </Card>
    </div>
  );
}
