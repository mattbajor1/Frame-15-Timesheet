import { useCallback, useEffect, useMemo, useState } from "react";
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

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [err, setErr] = useState("");

  useEffect(()=>{
    const cached = api.listsCached();
    if (cached) {
      setProjects(cached.projects||[]);
      setUsers((cached.users||[]).filter(u=>u.active!==false));
      setLoading(false);
    }
  },[]);

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const r = await api.lists();
      setProjects(r.projects||[]);
      setUsers((r.users||[]).filter(u=>u.active !== false));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally { setLoading(false); }
  }, []);

  useEffect(()=>{ if (email) load(); }, [email, load]);

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
      const r = await api.addProject({ ...form });
      setModal(false);
      await load();
      alert(`Project created: ${r.number}`);
    } catch (err) { alert(`Create failed: ${err?.message || err}`); }
    finally { setSaving(false); }
  }

  async function openDetail(number){
    setLoadingDetail(true);
    setErr("");
    const cached = api.projectDetailsCached(number);
    if (cached) setDetail(cached);
    try {
      const d = await api.projectDetails(number);
      if (!d.ok) throw new Error(d.error || 'Failed');
      setDetail(d);
    } catch (e) { setErr(String(e?.message || e)); }
    finally { setLoadingDetail(false); }
  }
  function backToList(){ setDetail(null); }

  return detail ? (
    <ProjectDetail detail={detail} users={users} onBack={backToList} refreshProject={async ()=>{
      const d = await api.projectDetails(detail.project.number);
      setDetail(d);
      await load();
    }}/>
  ) : (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className="w-full md:w-80 rounded-xl px-3 py-2 border bg-transparent"
               style={{borderColor:"var(--line)"}} placeholder="Search projects…"
               value={q} onChange={e=>setQ(e.target.value)} />
        <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={openModal}>New project</button>
      </div>

      <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
        <div className="text-xl font-semibold mb-3">Projects <span className="text-gray-400 text-sm">({filtered.length})</span></div>
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({length:6}).map((_,i)=><div key={i} className="h-28 rounded-xl animate-pulse" style={{background:"var(--surface-2)", border:"1px solid var(--line)"}} />)}
          </div>
        ) : filtered.length===0 ? (
          <div className="text-gray-400">No projects yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(p=>(
              <button key={p.number}
                      className="text-left rounded-xl p-4 hover:-translate-y-0.5 transition"
                      style={{border:"1px solid var(--line)", background:"var(--surface-2)"}}
                      onClick={()=>openDetail(p.number)}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.number}</div>
                  <span className="text-xs px-2 py-1 rounded-full" style={{border:"1px solid var(--line)"}}>{p.status}</span>
                </div>
                <div className="text-sm mt-1">{p.name}</div>
                <div className="text-xs text-gray-400">{p.client || "—"}</div>
                <div className="text-xs text-gray-500 mt-2">
                  {p.startDate ? `Start: ${new Date(p.startDate).toLocaleDateString()}` : "No start"} · {p.dueDate ? `Due: ${new Date(p.dueDate).toLocaleDateString()}` : "No due"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
            <div className="text-xl font-semibold">New Project</div>
            <div className="text-xs text-gray-400 mt-1">Next number will be <b>{hint || "P - 1000"}</b>.</div>
            <div className="grid gap-3 mt-3">
              <input className="rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}}
                     placeholder="Project name" value={form.name} onChange={e=>setForm(f=>({ ...f, name:e.target.value }))} />
              <input className="rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}}
                     placeholder="Client (optional)" value={form.client} onChange={e=>setForm(f=>({ ...f, client:e.target.value }))} />
              <select className="rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}}
                      value={form.status} onChange={e=>setForm(f=>({ ...f, status:e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 rounded-xl" style={{border:"1px solid var(--line)"}} onClick={()=>setModal(false)} disabled={saving}>Cancel</button>
              <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={submit} disabled={saving}>
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
      {loadingDetail && <div className="text-gray-400">Loading…</div>}
      {err && <div className="text-red-500 text-sm">{err}</div>}
    </div>
  );
}

function ProjectDetail({ detail, users, onBack, refreshProject }) {
  const p = detail.project;
  const [edit, setEdit] = useState({ name: p.name, client: p.client, status: p.status, startDate: p.startDate, dueDate: p.dueDate, budgetHours: p.budgetHours, notes: p.notes });
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [err, setErr] = useState("");

  async function saveMeta() {
    setErr("");
    try { await api.updateProject({ number: p.number, ...edit }); await refreshProject(); }
    catch (e){ setErr(String(e?.message || e)); }
  }
  async function quickAddTask(e){
    e.preventDefault();
    const name = newTask.trim();
    if(!name) return;
    setErr("");
    setAdding(true);
    try {
      await api.addTask({ projectNumber: p.number, taskName: name });
      setNewTask("");
      await refreshProject();
    } catch (e) {
      setErr(`Add failed: ${String(e?.message || e)}`);
    } finally { setAdding(false); }
  }
  async function changeAssignee(task, email){
    setErr("");
    try { await api.updateTask({ id: task.id, assigneeEmail: email }); await refreshProject(); }
    catch (e){ setErr(String(e?.message || e)); }
  }
  async function changeDue(task, dueISO){
    setErr("");
    try { await api.updateTask({ id: task.id, dueISO }); await refreshProject(); }
    catch (e){ setErr(String(e?.message || e)); }
  }
  async function changeProgress(task, progress){
    setErr("");
    try { await api.updateTask({ id: task.id, progress: Math.max(0, Math.min(100, Number(progress||0))) }); await refreshProject(); }
    catch (e){ setErr(String(e?.message || e)); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button className="px-3 py-1.5 rounded-lg hover:bg-white/10" onClick={onBack}>← Back</button>
        <div className="text-xl font-semibold">{p.number}</div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
          <label className="text-xs text-gray-400">Name</label>
          <input className="mt-1 w-full rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}}
                 value={edit.name} onChange={e=>setEdit(v=>({...v, name:e.target.value}))}/>
          <label className="text-xs text-gray-400 mt-3 block">Client</label>
          <input className="mt-1 w-full rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}}
                 value={edit.client} onChange={e=>setEdit(v=>({...v, client:e.target.value}))}/>
          <label className="text-xs text-gray-400 mt-3 block">Status</label>
          <select className="mt-1 w-full rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}}
                  value={edit.status} onChange={e=>setEdit(v=>({...v, status:e.target.value}))}>
            {["Planning","Active","On Hold","Done"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
          <label className="text-xs text-gray-400">Start</label>
          <input type="date" className="mt-1 w-full rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}}
                 value={edit.startDate || ""} onChange={e=>setEdit(v=>({...v, startDate:e.target.value}))}/>
          <label className="text-xs text-gray-400 mt-3 block">Due</label>
          <input type="date" className="mt-1 w-full rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}}
                 value={edit.dueDate || ""} onChange={e=>setEdit(v=>({...v, dueDate:e.target.value}))}/>
          <label className="text-xs text-gray-400 mt-3 block">Budget (hours)</label>
          <input type="number" className="mt-1 w-full rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}}
                 value={edit.budgetHours || 0} onChange={e=>setEdit(v=>({...v, budgetHours:Number(e.target.value||0)}))}/>
        </div>

        <div className="rounded-2xl p-5 md:col-span-2" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
          <label className="text-xs text-gray-400">Notes</label>
          <textarea rows={3} className="mt-1 w-full rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}}
                    value={edit.notes} onChange={e=>setEdit(v=>({...v, notes:e.target.value}))}/>
          <div className="flex justify-end mt-3">
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={saveMeta}>Save changes</button>
          </div>
          {err && <div className="text-red-500 text-sm mt-2">{err}</div>}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5 lg:col-span-2" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
          <div className="text-xl font-semibold mb-3">Tasks</div>
          <form onSubmit={quickAddTask} className="flex gap-2 mb-3">
            <input className="flex-1 rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}}
                   placeholder="• Add a task and press Enter" value={newTask} onChange={e=>setNewTask(e.target.value)} />
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" disabled={adding}>
              {adding ? "Adding…" : "Add"}
            </button>
          </form>

          <div className="space-y-2">
            {detail.tasks.length === 0 ? (
              <div className="text-gray-400 text-sm">No tasks yet.</div>
            ) : detail.tasks.map(t => (
              <div key={t.id} className="rounded-xl p-4" style={{border:"1px solid var(--line)", background:"var(--surface-2)"}}>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-gray-400 mt-1 flex gap-4 items-center flex-wrap">
                  <div className="flex items-center gap-1">
                    <span>Assignee:</span>
                    <select className="rounded-lg px-2 py-1 border bg-transparent text-sm" style={{borderColor:"var(--line)"}}
                            value={t.assignee || ""} onChange={e=>changeAssignee(t, e.target.value)}>
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.email} value={u.email}>{u.name || u.email}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Due:</span>
                    <input type="date" className="rounded-lg px-2 py-1 border bg-transparent text-sm" style={{borderColor:"var(--line)"}}
                           value={t.dueISO || ""} onChange={e=>changeDue(t, e.target.value)} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Progress:</span>
                    <input type="number" min="0" max="100" className="rounded-lg px-2 py-1 border bg-transparent text-sm w-20" style={{borderColor:"var(--line)"}}
                           value={t.progress} onChange={e=>changeProgress(t, e.target.value)} />
                    <span>%</span>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs px-2 py-1 rounded-full" style={{border:"1px solid var(--line)"}}>
                      {(detail.time.byTask.find(x=>x.task===t.name)?.hours || 0).toFixed(2)} h
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
          <div className="text-xl font-semibold mb-2">People · hours</div>
          {detail.time.byUser.length === 0 ? (
            <div className="text-gray-400 text-sm">No time logged yet.</div>
          ) : (
            <div className="space-y-2">
              {detail.time.byUser.map(u=>(
                <div key={u.user} className="flex items-center justify-between border-b pb-2" style={{borderColor:"var(--line)"}}>
                  <div className="text-sm">{u.user}</div>
                  <div className="text-sm font-semibold">{u.hours.toFixed(2)} h</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
        <div className="text-xl font-semibold mb-2">Calendar (next 2 weeks)</div>
        <MiniCalendar start={p.startDate} due={p.dueDate} tasks={detail.tasks} />
      </div>
    </div>
  );
}

function MiniCalendar({ start, due, tasks }) {
  const days = [...Array(14)].map((_,i)=> { const d = new Date(); d.setDate(d.getDate()+i); return d; });
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
          <div key={k} className="rounded-xl p-3" style={{border:"1px solid var(--line)", background:"var(--surface-2)"}}>
            <div className="text-xs text-gray-400">{fmt(d)}</div>
            {!inRange && <div className="text-[10px] text-gray-500 mt-1">outside project</div>}
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
