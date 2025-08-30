import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const STATUSES  = ["Planning","Active","On Hold","Done","Archived"];
const PRIORITY  = ["Low","Medium","High","Urgent"];

const toISODate = (s) => (s ? new Date(s).toISOString().slice(0,10) : "");
const numOrEmpty = (v) => (v===""||v==null? "" : Number(v));

function ProgressBadge({ value }){
  const c = value >= 100 ? "bg-blue-600 text-white" : "border";
  return <span className={`text-xs px-2 py-1 rounded-full ${c}`}>{value}%</span>;
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <div className="text-xs text-neutral-400 mt-1">{hint}</div>}
    </div>
  );
}

export default function Projects(){
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [hintNumber, setHintNumber] = useState("P - 1000");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const empty = {
    number:"", name:"", client:"", owner:"",
    status:"Planning", priority:"Medium",
    startDate:"", dueDate:"", budgetHours:"", rate:"",
    billable:true, tags:"", description:""
  };
  const [form, setForm] = useState(empty);

  useEffect(()=>{ (async()=>{ try{
    const r = await api.lists(); setProjects(r.projects||[]); setTasks(r.tasks||[]);
  }catch(e){ setError(String(e.message||e)); } })(); }, []);
  async function refresh(){ const r = await api.lists(); setProjects(r.projects||[]); setTasks(r.tasks||[]); }

  async function openNew(){
    setError(""); setForm(empty); setStep(0); setOpen(true);
    try{ const r = await api.nextProjectNumber(); setHintNumber(r?.number || "P - 1000"); }
    catch{ setHintNumber("P - 1000"); }
  }

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    return (projects||[]).filter(p=>{
      const matchesQ = !s || `${p.number} ${p.name} ${p.client} ${p.owner} ${p.status} ${p.priority}`.toLowerCase().includes(s);
      const m1 = !statusFilter || p.status === statusFilter;
      const m2 = !priorityFilter || p.priority === priorityFilter;
      const m3 = !ownerFilter || (p.owner||"").toLowerCase().includes(ownerFilter.toLowerCase());
      return matchesQ && m1 && m2 && m3;
    });
  }, [projects,q,statusFilter,priorityFilter,ownerFilter]);

  const progressByProject = useMemo(()=>{
    const map = new Map();
    (tasks||[]).forEach(t=>{ const k=t.projectNumber, v=Number(t.progress??0); if(!map.has(k)) map.set(k,[0,0]); const c=map.get(k); map.set(k,[c[0]+v,c[1]+1]); });
    const out={}; map.forEach((v,k)=> out[k] = v[1]? Math.round(v[0]/v[1]) : 0); return out;
  }, [tasks]);

  async function createProject(e){
    e?.preventDefault?.();
    if(!form.name){ setError("Please enter a project name."); return; }
    setSaving(true); setError("");
    try{
      const payload = { ...form,
        startDate: toISODate(form.startDate),
        dueDate: toISODate(form.dueDate),
        budgetHours: numOrEmpty(form.budgetHours),
        rate: numOrEmpty(form.rate),
      };
      if(!payload.number) delete payload.number;
      const r = await api.addProject(payload);
      setOpen(false); await refresh();
      alert(`Project created: ${r.number || payload.number || hintNumber}`);
    }catch(e2){ setError(String(e2.message||e2)); }
    finally{ setSaving(false); }
  }

  async function quickStatus(number, status){
    try{ await api.updateProject({ number, status }); await refresh(); }
    catch(e){ alert(String(e.message||e)); }
  }

  const ownerOptions = useMemo(()=>{
    const set = new Set((projects||[]).map(p=>(p.owner||"").trim()).filter(Boolean));
    return Array.from(set);
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="f15-card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 flex flex-wrap gap-2">
            <input className="f15-input" placeholder="Search projects…" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="f15-select max-w-44" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">Status: All</option>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select className="f15-select max-w-44" value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}>
              <option value="">Priority: All</option>{PRIORITY.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <input className="f15-input max-w-48" placeholder="Owner filter…" value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button className="f15-btn" onClick={()=>{ setQ(""); setStatusFilter(""); setPriorityFilter(""); setOwnerFilter(""); }}>Clear</button>
            <button className="f15-btn f15-btn--primary" onClick={openNew}>New project</button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="f15-card">
        <div className="flex items-center justify-between mb-3">
          <div className="f15-h2">Projects <span className="text-neutral-400 text-sm">({filtered.length})</span></div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-neutral-400">No projects yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p=>(
              <div key={p.number} className="relative overflow-hidden rounded-2xl border" style={{ borderColor: "var(--line)" }}>
                {/* priority stripe */}
                <div className="absolute inset-y-0 left-0 w-1"
                     style={{ background: p.priority==="Urgent"? "linear-gradient(#ef4444,#b91c1c)" :
                                      p.priority==="High"  ? "linear-gradient(#f97316,#b45309)" :
                                      p.priority==="Medium"? "linear-gradient(#22c55e,#15803d)" :
                                                             "linear-gradient(#60a5fa,#1d4ed8)" }} />
                <div className="p-4 pl-5">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{p.number}</div>
                    <ProgressBadge value={progressByProject[p.number] ?? 0} />
                  </div>
                  <div className="text-sm text-white/90">{p.name}</div>
                  <div className="text-xs text-neutral-400 mt-1">{p.client || "—"} • {p.owner || "Unassigned"}</div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-300">
                    <div><span className="text-neutral-400">Priority: </span>{p.priority || "—"}</div>
                    <div><span className="text-neutral-400">Status: </span>{p.status}</div>
                    <div><span className="text-neutral-400">Start: </span>{p.startDate || "—"}</div>
                    <div><span className="text-neutral-400">Due: </span>{p.dueDate || "—"}</div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <select className="f15-select" value={p.status} onChange={(e)=>quickStatus(p.number, e.target.value)}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {p.tags && p.tags.split(",").slice(0,3).map(t=>(
                      <span key={t.trim()} className="f15-chip">{t.trim()}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && <div className="bg-red-500/15 border border-red-500/40 text-red-300 rounded-xl px-4 py-2 text-sm">{error}</div>}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="f15-card w-full max-w-3xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="f15-h2">New Project</div>
              <div className="text-sm text-neutral-400">Step {step+1} of 2</div>
            </div>

            <form onSubmit={createProject} className="grid gap-4">
              {step === 0 ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Project Number" hint={`Leave blank for auto (next is ${hintNumber}).`}>
                      <input className="f15-input" placeholder={hintNumber} value={form.number}
                             onChange={(e)=>setForm(f=>({ ...f, number: e.target.value }))}/>
                    </Field>
                    <Field label="Project Name">
                      <input className="f15-input" required value={form.name}
                             onChange={(e)=>setForm(f=>({ ...f, name: e.target.value }))}/>
                    </Field>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Client">
                      <input className="f15-input" value={form.client}
                             onChange={(e)=>setForm(f=>({ ...f, client: e.target.value }))}/>
                    </Field>
                    <Field label="Owner / PM">
                      <input list="owner-suggestions" className="f15-input" value={form.owner}
                             onChange={(e)=>setForm(f=>({ ...f, owner: e.target.value }))}/>
                      <datalist id="owner-suggestions">
                        {ownerOptions.map(o => <option key={o} value={o} />)}
                      </datalist>
                    </Field>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <Field label="Status">
                      <select className="f15-select" value={form.status}
                              onChange={(e)=>setForm(f=>({ ...f, status: e.target.value }))}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Priority">
                      <select className="f15-select" value={form.priority}
                              onChange={(e)=>setForm(f=>({ ...f, priority: e.target.value }))}>
                        {PRIORITY.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="Billable">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={!!form.billable}
                               onChange={(e)=>setForm(f=>({ ...f, billable: e.target.checked }))}/>
                        <span className="text-sm">Yes</span>
                      </label>
                    </Field>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Start date">
                      <input type="date" className="f15-input" value={form.startDate}
                             onChange={(e)=>setForm(f=>({ ...f, startDate: e.target.value }))}/>
                    </Field>
                    <Field label="Due date">
                      <input type="date" className="f15-input" value={form.dueDate}
                             onChange={(e)=>setForm(f=>({ ...f, dueDate: e.target.value }))}/>
                    </Field>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Budget (hours)">
                      <input inputMode="decimal" className="f15-input" placeholder="e.g. 120" value={form.budgetHours}
                             onChange={(e)=>setForm(f=>({ ...f, budgetHours: e.target.value.replace(/[^\d.]/g,"") }))}/>
                    </Field>
                    <Field label="Rate (per hour)">
                      <input inputMode="decimal" className="f15-input" placeholder="e.g. 150" value={form.rate}
                             onChange={(e)=>setForm(f=>({ ...f, rate: e.target.value.replace(/[^\d.]/g,"") }))}/>
                    </Field>
                  </div>

                  <Field label="Tags" hint="Comma-separated, e.g. brand, web, video">
                    <input className="f15-input" value={form.tags}
                           onChange={(e)=>setForm(f=>({ ...f, tags: e.target.value }))}/>
                  </Field>

                  <Field label="Description / Notes">
                    <textarea rows={4} className="f15-textarea" value={form.description}
                              onChange={(e)=>setForm(f=>({ ...f, description: e.target.value }))}/>
                  </Field>
                </>
              )}

              <div className="flex items-center justify-between pt-1">
                <button type="button" className="f15-btn" onClick={()=>setOpen(false)}>Cancel</button>
                <div className="flex gap-2">
                  {step>0 && <button type="button" className="f15-btn" onClick={()=>setStep(step-1)}>Back</button>}
                  {step<1
                    ? <button type="button" className="f15-btn f15-btn--blue" onClick={()=>setStep(step+1)}>Next</button>
                    : <button type="submit" className="f15-btn f15-btn--primary" disabled={saving}>{saving?"Saving…":"Create project"}</button>
                  }
                </div>
              </div>

              {error && <div className="text-red-300 text-sm">{error}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
