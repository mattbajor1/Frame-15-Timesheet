// src/ProjectsAdmin.jsx
import { useEffect, useState } from 'react'
import { useAuth, SignInButton } from './auth.jsx'
import Select from './components/Select' // ensure file is Select.jsx

const API_BASE = '/.netlify/functions/time-api'

export default function ProjectsAdmin() {
  const { token } = useAuth()
  const [settings, setSettings] = useState({ priorities: [], statuses: [], stages: [], health: [], riskLevels: [] })
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    ProjectName: '',
    ClientName: '',
    Priority: '',
    Status: 'Planning',
    Stage: 'Discovery',
    Health: 'On Track',
    DueDate: '',
    StartDate: '',
    ColorHex: '',
  })

  async function authedFetch(url, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(url, { ...opts, headers })
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed')
    return res.json()
  }

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const s = await authedFetch(`${API_BASE}?action=get-settings`)
      setSettings(s)
      const p = await authedFetch(`${API_BASE}?action=list-projects`)
      setProjects(p.projects || [])
    })().catch(e => alert(e.message))
  }, [token])

  async function createProject() {
    if (!form.ProjectName) return alert('Project name is required')
    setLoading(true)
    try {
      const resp = await authedFetch(`${API_BASE}?action=create-project`, {
        method: 'POST',
        body: JSON.stringify(form)
      })
      const p = await authedFetch(`${API_BASE}?action=list-projects`)
      setProjects(p.projects || [])
      setForm({ ProjectName:'', ClientName:'', Priority:'', Status:'Planning', Stage:'Discovery', Health:'On Track', DueDate:'', StartDate:'', ColorHex:'' })
      alert(`Created project #${resp.projectNumber}`)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        {!token && <SignInButton id="gsi-btn-projects" />}
      </header>

      {token && (
        <section className="bg-neutral-900/50 rounded-2xl p-5 border border-neutral-800">
          <h2 className="text-lg mb-3">Create Project</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-neutral-300">Project Name</span>
              <input className="bg-neutral-800 rounded-xl p-3 outline-none border border-neutral-700" value={form.ProjectName} onChange={e=>setForm({...form, ProjectName:e.target.value})} placeholder="Scout & Griffin"/>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-neutral-300">Client Name</span>
              <input className="bg-neutral-800 rounded-xl p-3 outline-none border border-neutral-700" value={form.ClientName} onChange={e=>setForm({...form, ClientName:e.target.value})} placeholder="Client Co."/>
            </label>
            <Select label="Priority" value={form.Priority} onChange={v=>setForm({...form, Priority:v})} options={settings.priorities || []} />
            <Select label="Status" value={form.Status} onChange={v=>setForm({...form, Status:v})} options={settings.statuses || []} />
            <Select label="Stage" value={form.Stage} onChange={v=>setForm({...form, Stage:v})} options={settings.stages || []} />
            <Select label="Health" value={form.Health} onChange={v=>setForm({...form, Health:v})} options={settings.health || []} />
            <label className="grid gap-1 text-sm">
              <span className="text-neutral-300">Start Date</span>
              <input type="date" className="bg-neutral-800 rounded-xl p-3 outline-none border border-neutral-700" value={form.StartDate} onChange={e=>setForm({...form, StartDate:e.target.value})}/>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-neutral-300">Due Date</span>
              <input type="date" className="bg-neutral-800 rounded-xl p-3 outline-none border border-neutral-700" value={form.DueDate} onChange={e=>setForm({...form, DueDate:e.target.value})}/>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-neutral-300">Color (hex)</span>
              <input className="bg-neutral-800 rounded-xl p-3 outline-none border border-neutral-700" value={form.ColorHex} onChange={e=>setForm({...form, ColorHex:e.target.value})} placeholder="#EAB308"/>
            </label>
          </div>
          <div className="mt-4">
            <button onClick={createProject} disabled={loading} className="rounded-xl p-3 border border-emerald-500/50 hover:bg-emerald-500/10">➕ Create Project</button>
          </div>
        </section>
      )}

      {token && (
        <section className="bg-neutral-900/50 rounded-2xl p-5 border border-neutral-800">
          <h2 className="text-lg mb-3">All Projects</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Client</th>
                  <th className="text-left p-2">Priority</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Stage</th>
                  <th className="text-left p-2">Health</th>
                  <th className="text-left p-2">Start</th>
                  <th className="text-left p-2">Due</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.ProjectNumber} className="border-t border-neutral-800">
                    <td className="p-2 font-medium">{p.ProjectNumber}</td>
                    <td className="p-2">{p.ProjectName}</td>
                    <td className="p-2">{p.ClientName}</td>
                    <td className="p-2">{p.Priority}</td>
                    <td className="p-2">{p.Status}</td>
                    <td className="p-2">{p.Stage}</td>
                    <td className="p-2">{p.Health}</td>
                    <td className="p-2">{p.StartDate}</td>
                    <td className="p-2">{p.DueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
