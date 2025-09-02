// src/pages/Projects.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const STATUSES = ["Planning","Active","On Hold","Done"];

export default function Projects({ email }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [hint, setHint] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", client: "", status: "Active" });

  // load after login
  useEffect(()=>{ if (email) load(); }, [email]);
  async function load(){ const r = await api.lists(); setProjects(r.projects||[]); setTasks(r.tasks||[]); }

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    if(!s) return projects;
    return projects.filter(p => `${p.number} ${p.name} ${p.client} ${p.status}`.toLowerCase().includes(s));
  }, [projects, q]);

  // Open modal immediately, then fetch hint (no form reset after)
  function openModal(){
    setForm({ name:"", client:"", status:"Active" });
    setModal(true);
    api.nextProjectNumber().then(r=>setHint(r.number)).catch(()=>setHint("P - 1000"));
  }

  async function submit(){
    if(!form.name) { alert("Project name is required."); return; }
    setSaving(true);
    try {
      const r = await api.addProject({ ...form }); // number auto-assigned server-side
      setModal(false);
      await load();
      alert(`Project created: ${r.number}`);
    } catch (err) {
      alert(`Create failed: ${err?.message || err}`);
    } finally {
      setSaving(false);
    }
  }

  const progressByProject = useMemo(() => {
    const map = new Map();
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
    try {
      await api.updateProject({ number, status });
      await load();
    } catch (e) {
      alert(`Update failed: ${e?.message || e}`);
    }
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
        {filtered.length===0 ? <div className="text-neutral-500">No projects yet.</div> :
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p=>(
              <div key={p.number} className="f15-tile">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.number}</div>
                  <ProgressBadge value={progressByProject[p.number] ?? 0} />
                </div>
                <div className="text-sm text-neutral-800">{p.name}</div>
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
              <div className="text-xs text-neutral-500">
                Next number will be <b>{hint || "P - 1000"}</b>.
              </div>
              <input className="f15-input" placeholder="Project name" value={form.name}
                     onChange={e=>setForm(f=>({ ...f, name: e.target.value }))}/>
              <input className="f15-input" placeholder="Client (optional)" value={form.client}
                     onChange={e=>setForm(f=>({ ...f, client: e.target.value }))}/>
              <select className="f15-select" value={form.status} onChange={e=>setForm(f=>({ ...f, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button className="f15-btn" onClick={()=>setModal(false)} disabled={saving}>Cancel</button>
              <button className="f15-btn f15-btn--primary" onClick={submit} disabled={saving}>
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
