import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const STATUSES = ["Planning","Active","On Hold","Done"];

export default function Projects({ email }) {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [hint, setHint] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", client: "", status: "Active" });

  const [detail, setDetail] = useState(null); // { project, tasks, time }
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function load(){
    const r = await api.lists();
    setProjects(r.projects||[]);
    setUsers((r.users||[]).filter(u=>u.active !== false));
  }
  useEffect(()=>{ if (email) load(); }, [email]);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    if(!s) return projects;
    return projects.filter(p => `${p.number} ${p.name} ${p.client} ${p.status}`.toLowerCase().includes(s));
  }, [projects, q]);

  function openModal(){
    setForm({ name:"", client:"", status:"Active" });
    setModal(true);
    api.nextProjectNumber().then(r=>setHint(r.number)).catch(()=>setHint("P - 1000"));
  }
  async function submit(){
    if(!form.name) { alert("Project name is required."); return; }
    setSaving(true);
    try {
      const r = await api.addProject({ ...form }); // auto-number
      setModal(false);
      await load();
      alert(`Project created: ${r.number}`);
    } catch (err) { alert(`Create failed: ${err?.message || err}`); }
    finally { setSaving(false); }
  }

  async function openDetail(number){
    setLoadingDetail(true);
    try {
      const d = await api.projectDetails(number);
      if (!d.ok) throw new Error(d.error || 'Failed');
      setDetail(d);
    } catch (e) { alert(String(e?.message || e)); }
    finally { setLoadingDetail(false); }
  }

  function backToList(){ setDetail(null); }

  return detail ? (
    <ProjectDetail detail={detail} users={users} refreshProject={async ()=>{
      const d = await api.projectDetails(detail.project.number);
      setDetail(d);
      await load();
    }} onBack={backToList} />
  ) : (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="f15-input" placeholder="Search projects…" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="f15-btn f15-btn--primary" onClick={openModal}>New project</button>
      </div>

      <div className="f15-card">
        <div className="f15-h2 mb-3">Projects <span className="text-neutral-400 text-sm">({filtered.length})</span></div>
        {filtered.length===0 ? <div className="text-neutral-400">No projects yet.</div> :
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p=>(
              <button key={p.number} className="f15-tile text-left" onClick={()=>openDetail(p.number)}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.number}</div>
                  <span className="text-xs px-2 py-1 rounded-full border">{p.status}</span>
                </div>
                <div className="text-sm mt-1">{p.name}</div>
                <div className="text-xs text-neutral-400">{p.client || "—"}</div>
                <div className="text-xs text-neutral-400 mt-2">
                  {p.startDate ? `Start: ${new Date(p.startDate).toLocaleDateString()}` : "No start"} · {p.dueDate ? `Due: ${new Date(p.dueDate).toLocaleDateString()}` : "No due"}
                </div>
              </button>
            ))}
          </div>
        }
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="f15-card w-full max-w-lg space-y-3">
            <div className="f15-h2">New Project</div>
            <div className="grid gap-3">
              <div className="text-xs text-neutral-400">Next number will be <b>{hint || "P - 1000"}</b>.</div>
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
      {loadingDetail && <div className="text-neutral-400">Loading…</div>}
    </div>
  );
}

/* ========== Project Detail (inline component) ========== */
function ProjectDetail({ detail, users, onBack, refreshProject }) {
  const p = detail.project;
  const [edit, setEdit] = useState({ name: p.name, client: p.client, status: p.status, startDate: p.startDate, dueDate: p.dueDate, budgetHours: p.budgetHours, notes: p.notes });
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState("");

  async function saveMeta() {
    await api.updateProject({ number: p.number, ...edit });
    await refreshProject();
  }
  async function quickAddTask(e){
    e.preventDefault();
    const name = newTask.trim();
    if(!name) return;
    setAdding(true);
    try {
      await api.addTask({ projectNumber: p.number, taskName: name });
      setNewTask("");
      await refreshProject();
    } finally { setAdding(false); }
  }
  async function changeAssignee(task, email){
    await api.updateTask({ id: task.id, assigneeEmail: email });
    await refreshProject();
  }
  async function changeDue(task, dueISO){
    await api.updateTask({ id: task.id, dueISO });
    await refreshProject();
  }
  async function changeProgress(task, progress){
    await api.updateTask({ id: task.id, progress });
    await refreshProject();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="f15-btn" onClick={onBack}>← Back</button>
        <div className="f15-h2">{p.number}</div>
      </div>

      <div className="f15-card grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs text-neutral-400">Name</label>
          <input className="f15-input" value={edit.name} onChange={e=>setEdit(v=>({...v, name:e.target.value}))}/>
          <label className="text-xs text-neutral-400">Client</label>
          <input className="f15-input" value={edit.client} onChange={e=>setEdit(v=>({...v, client:e.target.value}))}/>
          <label className="text-xs text-neutral-400">Status</label>
          <select className="f15-select" value={edit.status} onChange={e=>setEdit(v=>({...v, status:e.target.value}))}>
            {["Planning","Active","On Hold","Done"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-neutral-400">Start</label>
          <input className="f15-input" type="date" value={edit.startDate || ""} onChange={e=>setEdit(v=>({...v, startDate:e.target.value}))}/>
          <label className="text-xs text-neutral-400">Due</label>
          <input className="f15-input" type="date" value={edit.dueDate || ""} onChange={e=>setEdit(v=>({...v, dueDate:e.target.value}))}/>
          <label className="text-xs text-neutral-400">Budget (hours)</label>
          <input className="f15-input" type="number" value={edit.budgetHours || 0} onChange={e=>setEdit(v=>({...v, budgetHours: Number(e.target.value||0)}))}/>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-neutral-400">Notes</label>
          <textarea className="f15-input" rows={3} value={edit.notes} onChange={e=>setEdit(v=>({...v, notes:e.target.value}))}/>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button className="f15-btn f15-btn--primary" onClick={saveMeta}>Save changes</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="f15-card lg:col-span-2">
          <div className="f15-h2 mb-2">Tasks</div>
          <form onSubmit={quickAddTask} className="flex gap-2 mb-3">
            <input className="f15-input" placeholder="• Add a task and press Enter" value={newTask}
                   onChange={e=>setNewTask(e.target.value)} />
            <button className="f15-btn f15-btn--blue" disabled={adding}>{adding ? "Adding…" : "Add"}</button>
          </form>

          <div className="space-y-2">
            {detail.tasks.length === 0 ? (
              <div className="text-neutral-400 text-sm">No tasks yet.</div>
            ) : detail.tasks.map(t => (
              <div key={t.id} className="f15-tile">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-neutral-400 mt-1 flex gap-4 items-center">
                  <div className="flex items-center gap-1">
                    <span>Assignee:</span>
                    <select className="f15-select" value={t.assignee || ""} onChange={e=>changeAssignee(t, e.target.value)}>
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Due:</span>
                    <input className="f15-input" type="date" value={t.dueISO || ""} onChange={e=>changeDue(t, e.target.value)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Progress:</span>
                    <input className="f15-input" type="number" min="0" max="100" value={t.progress}
                           onChange={e=>changeProgress(t, Math.max(0, Math.min(100, Number(e.target.value||0))))} style={{width:90}}/>
                    <span>%</span>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs px-2 py-1 rounded-full border">{(detail.time.byTask.find(x=>x.task===t.name)?.hours || 0).toFixed(2)} h</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="f15-card">
          <div className="f15-h2 mb-2">People · hours</div>
          {detail.time.byUser.length === 0 ? (
            <div className="text-neutral-400 text-sm">No time logged yet.</div>
          ) : (
            <div className="space-y-2">
              {detail.time.byUser.map(u=>(
                <div key={u.user} className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                  <div className="text-sm">{u.user}</div>
                  <div className="text-sm font-semibold">{u.hours.toFixed(2)} h</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="f15-card">
        <div className="f15-h2 mb-2">Calendar</div>
        <MiniCalendar start={p.startDate} due={p.dueDate} tasks={detail.tasks} />
      </div>
    </div>
  );
}

/* ========== simple mini calendar (2 weeks) ========== */
function MiniCalendar({ start, due, tasks }) {
  const days = [...Array(14)].map((_,i)=> {
    const d = new Date(); d.setDate(d.getDate()+i); return d;
  });
  const dueByDay = new Map();
  tasks.filter(t=>t.dueISO).forEach(t=>{
    const k = new Date(t.dueISO).toISOString().slice(0,10);
    if(!dueByDay.has(k)) dueByDay.set(k, []);
    dueByDay.get(k).push(t.name);
  });
  function fmt(d){ return d.toLocaleDateString(undefined,{month:'short', day:'numeric'}); }
  const s = start ? new Date(start) : null; const e = due ? new Date(due) : null;

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(d=>{
        const k = d.toISOString().slice(0,10);
        const items = dueByDay.get(k)||[];
        const inRange = (!s || d>=s) && (!e || d<=e);
        return (
          <div key={k} className="f15-tile">
            <div className="text-xs text-neutral-400">{fmt(d)}</div>
            {inRange ? null : <div className="text-[10px] text-neutral-500 mt-1">outside project</div>}
            {items.length>0 && (
              <ul className="mt-2 text-xs list-disc pl-4">
                {items.map((t,i)=><li key={i}>{t}</li>)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
