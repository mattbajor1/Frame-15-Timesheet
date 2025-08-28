import { useState } from "react";
import { api } from "../lib/api";

export default function AdminPanel() {
  const [proj, setProj] = useState({ number: "", name: "", client: "", status: "Active" });
  const [task, setTask] = useState({ id: "", projectNumber: "", taskName: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run(fn, payload) {
    setBusy(true);
    try {
      const r = await fn(payload);
      setMsg(JSON.stringify(r));
    } catch (e) {
      setMsg(String(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-5 space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Create Project</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="border rounded-xl px-3 py-2" placeholder="Project Number (e.g., PRJ-250901)"
                 value={proj.number} onChange={e=>setProj(p=>({...p, number:e.target.value}))}/>
          <input className="border rounded-xl px-3 py-2" placeholder="Project Name"
                 value={proj.name} onChange={e=>setProj(p=>({...p, name:e.target.value}))}/>
          <input className="border rounded-xl px-3 py-2" placeholder="Client"
                 value={proj.client} onChange={e=>setProj(p=>({...p, client:e.target.value}))}/>
          <input className="border rounded-xl px-3 py-2" placeholder="Status (Active/Planning)"
                 value={proj.status} onChange={e=>setProj(p=>({...p, status:e.target.value}))}/>
        </div>
        <button
          className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50"
          disabled={busy}
          onClick={()=>run(api.addProject, proj)}
        >Add Project</button>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Create Task</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <input className="border rounded-xl px-3 py-2" placeholder="Task ID (e.g., T-250901-01)"
                 value={task.id} onChange={e=>setTask(t=>({...t, id:e.target.value}))}/>
          <input className="border rounded-xl px-3 py-2" placeholder="Project Number"
                 value={task.projectNumber} onChange={e=>setTask(t=>({...t, projectNumber:e.target.value}))}/>
          <input className="border rounded-xl px-3 py-2" placeholder="Task Name"
                 value={task.taskName} onChange={e=>setTask(t=>({...t, taskName:e.target.value}))}/>
        </div>
        <button
          className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50"
          disabled={busy}
          onClick={()=>run(api.addTask, task)}
        >Add Task</button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-50"
          disabled={busy}
          onClick={()=>run(api.lockPastWeeks)}
        >Lock Past Weeks</button>

        <button
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50"
          disabled={busy}
          onClick={()=>run(api.truncate, ["Timers","TimeLog"])}
          title="Clears Timers and TimeLog rows (keeps headers)"
        >Clear Timers & TimeLog</button>
      </div>

      {msg && <pre className="text-xs bg-neutral-50 border rounded-xl p-3 overflow-auto">{msg}</pre>}
    </div>
  );
}
