import { useEffect, useMemo, useState } from "react";
import Card from "../components/Card";
import { api } from "../lib/api";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ number:"", name:"", client:"", status:"Active" });

  async function load(){ const r = await api.lists(); setProjects(r.projects||[]); }
  useEffect(()=>{ load(); }, []);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    if(!s) return projects;
    return projects.filter(p=> `${p.number} ${p.name} ${p.client} ${p.status}`.toLowerCase().includes(s));
  }, [projects, q]);

  async function submit(){
    if(!form.number || !form.name) return;
    await api.addProject(form);
    setModal(false);
    setForm({ number:"", name:"", client:"", status:"Active" });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="border rounded-xl px-3 py-2" placeholder="Search projects…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="px-4 py-2 rounded-xl border hover:bg-neutral-50" onClick={()=>setModal(true)}>New Project</button>
      </div>

      <Card title={`Projects (${filtered.length})`}>
        {filtered.length===0 ? <div className="text-neutral-500">No projects yet.</div> :
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map(p=>(
            <div key={p.number} className="border rounded-xl p-3 hover:bg-neutral-50">
              <div className="font-medium">{p.number}</div>
              <div className="text-sm text-neutral-600">{p.name}</div>
              <div className="text-xs text-neutral-500 mt-1">{p.client || "—"} · {p.status || "Active"}</div>
            </div>
          ))}
        </div>}
      </Card>

      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border p-6 w-full max-w-lg space-y-3">
            <h3 className="text-lg font-semibold">New Project</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="border rounded-xl px-3 py-2" placeholder="Project Number (PRJ-XXXXXX)" value={form.number} onChange={e=>setForm(f=>({...f, number:e.target.value}))}/>
              <input className="border rounded-xl px-3 py-2" placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))}/>
              <input className="border rounded-xl px-3 py-2" placeholder="Client" value={form.client} onChange={e=>setForm(f=>({...f, client:e.target.value}))}/>
              <input className="border rounded-xl px-3 py-2" placeholder="Status" value={form.status} onChange={e=>setForm(f=>({...f, status:e.target.value}))}/>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded-xl border" onClick={()=>setModal(false)}>Cancel</button>
              <button className="px-3 py-2 rounded-xl border border-neutral-900 bg-neutral-900 text-white" onClick={submit}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
