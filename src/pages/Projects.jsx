import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const PROGRESS = [0, 25, 50, 75, 100];
const STATUSES = ["Planning","Active","On Hold","Done"];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [hint, setHint] = useState("");
  const [form, setForm] = useState({ number: "", name: "", client: "", status: "Active" });

  async function load(){ const r = await api.lists(); setProjects(r.projects||[]); setTasks(r.tasks||[]); }
  useEffect(()=>{ load(); }, []);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    if(!s) return projects;
    return projects.filter(p => `${p.number} ${p.name} ${p.client} ${p.status}`.toLowerCase().includes(s));
  }, [projects, q]);

  async function openModal(){
    try { const r = await api.nextProjectNumber(); setHint(r.number); } catch { setHint("P - 1000"); }
    setForm({ number:"", name:"", client:"", status:"Active" });
    setModal(true);
  }

  async function submit(){
    if(!form.name) return;
    const payload = { ...form };
    if(!payload.number) delete payload.number; // auto-number
    const r = await api.addProject(payload);
    setModal(false);
    await load();
    alert(`Project created: ${r.number}`);
  }

  // compute simple avg progress per project from tasks
  const progressByProject = useMemo(() => {
    const map = new Map(); // proj -> [sum, count]
    tasks.forEach(t => {
      const p = t.projectNumber;
      const val = Number(t.progress ?? 0);
      if(!map.has(p)) map.set(p, [0,0]);
      const cur = map.get(p);
      map.set(p, [cur[0]+val, cur[1]+1]);
    });
    const out = {};
    map.forEach((v,k)=> out[k] = v[1] ? Math.round(v[0]/v[1]) : 0);
    return out;
  }, [tasks]);

  async function quickStatus(number, status){
    await api.updateProject({ number, status });
    await load();
  }

  function ProgressBadge({ value }){
    const c = value >= 100 ? "bg-blue-600 text-white" : "border";
    return <span className={`text-xs px-2 py-1 rounded-full ${c}`}>{value}%</span>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="f15-input" placeholder="Search projects…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="f15-btn f15-btn--primary" onClick={openModal}>New project</button>
      </div>

      <div className="f15-card">
        <div className="f15-h2 mb-3">Projects <span className="text-neutral-500 text-sm">({filtered.length})</span></div>
        {filtered.length===0 ? <div className="text-neutral-500">No projects.</div> :
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p=>(
              <div key={p.number} className="border rounded-2xl p-4" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.number}</div>
                  <ProgressBadge value={progressByProject[p.number] ?? 0} />
                </div>
                <div className="text-sm text-neutral-700">{p.name}</div>
                <div className="text-xs text-neutral-500 mt-1">{p.client || "—"}</div>
                <div className="mt-3 flex items-center gap-2">
                  <select className="f15-select" value={p.status} onChange={(e)=>quickStatus(p.number, e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        }
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="f15-card w-full max-w-lg space-y-3">
            <div className="f15-h2">New Project</div>
            <div className="grid gap-3">
              <div>
                <label className="text-sm font-medium">Project Number</label>
                <input className="f15-input mt-1" placeholder={hint || "P - 1000"} value={form.number}
                       onChange={e=>setForm(f=>({ ...f, number: e.target.value }))}/>
                <div className="text-xs text-neutral-500 mt-1">Leave blank to auto-assign (next is <b>{hint || "P - 1000"}</b>).</div>
              </div>
              <input className="f15-input" placeholder="Name" value={form.name} onChange={e=>setForm(f=>({ ...f, name: e.target.value }))}/>
              <input className="f15-input" placeholder="Client" value={form.client} onChange={e=>setForm(f=>({ ...f, client: e.target.value }))}/>
              <select className="f15-select" value={form.status} onChange={e=>setForm(f=>({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button className="f15-btn" onClick={()=>setModal(false)}>Cancel</button>
              <button className="f15-btn f15-btn--primary" onClick={submit}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
