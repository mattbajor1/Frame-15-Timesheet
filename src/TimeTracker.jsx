// src/TimeTracker.jsx
import { useEffect, useMemo, useState } from 'react'

const API_BASE = '/.netlify/functions/time-api'

function isoToLocalTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function TimeTracker() {
  const [user, setUser] = useState(null) // {token}
  const [meta, setMeta] = useState({ user: { color: '#888' }, projects: [], tasksMap: {} })
  const [status, setStatus] = useState({ active: false, session: null })
  const [projectNumber, setProjectNumber] = useState('')
  const [task, setTask] = useState('')
  const [entries, setEntries] = useState({ entries: [], totalMinutes: 0 })
  const [loading, setLoading] = useState(false)

  // Google Sign-In init
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
      if (!clientId) {
        console.warn('VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work.')
      }
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => setUser({ token: resp.credential }),
      })
      window.google?.accounts.id.renderButton(
        document.getElementById('gsi-btn'),
        { theme: 'outline', size: 'large' }
      )
    }
    document.body.appendChild(script)
  }, [])

  async function authedFetch(url, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    if (user?.token) headers['Authorization'] = `Bearer ${user.token}`
    const res = await fetch(url, { ...opts, headers })
    if (!res.ok) throw new Error((await res.json()).error || 'Request failed')
    return res.json()
  }

  useEffect(() => {
    if (!user?.token) return
    ;(async () => {
      const m = await authedFetch(`${API_BASE}?action=meta`)
      setMeta(m)
      const st = await authedFetch(`${API_BASE}?action=status`)
      setStatus(st)
      const en = await authedFetch(`${API_BASE}?action=entries`)
      setEntries(en)
    })().catch(console.error)
  }, [user?.token])

  const projectOptions = (meta.projects || []).map(p => ({
    value: String(p.number || p.ProjectNumber || p),
    label: p.name ? `${p.number} — ${p.name}` : (p.ProjectName ? `${p.ProjectNumber} — ${p.ProjectName}` : String(p))
  }))

  const availableTasks = useMemo(() => meta.tasksMap[String(projectNumber)] || [], [meta, projectNumber])

  async function clockIn() {
    if (!projectNumber) return alert('Pick a project')
    setLoading(true)
    try {
      await authedFetch(`${API_BASE}?action=clockin`, { method: 'POST', body: JSON.stringify({ projectNumber, task }) })
      const [st, en] = await Promise.all([
        authedFetch(`${API_BASE}?action=status`),
        authedFetch(`${API_BASE}?action=entries`),
      ])
      setStatus(st); setEntries(en)
    } catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  async function clockOut() {
    setLoading(true)
    try {
      await authedFetch(`${API_BASE}?action=clockout`, { method: 'POST', body: JSON.stringify({}) })
      const [st, en] = await Promise.all([
        authedFetch(`${API_BASE}?action=status`),
        authedFetch(`${API_BASE}?action=entries`),
      ])
      setStatus(st); setEntries(en)
    } catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  const totalHours = (entries.totalMinutes / 60).toFixed(2)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Time Tracker</h1>
        {!user?.token && <div id="gsi-btn" />}
      </header>

      {user?.token && (
        <div className="grid md:grid-cols-3 gap-6">
          <section className="md:col-span-2 bg-neutral-900/50 rounded-2xl p-5 border border-neutral-800">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <span
                className="inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full border"
                style={{ borderColor: meta.user.color, color: meta.user.color }}
              >
                ● Your color
              </span>
              {status.active ? (
                <span className="text-sm text-emerald-400">
                  On the clock since {isoToLocalTime(status.session?.ClockInISO)}
                </span>
              ) : (
                <span className="text-sm text-neutral-400">Currently clocked out</span>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <select
                className="bg-neutral-800 rounded-xl p-3 outline-none border border-neutral-700"
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
              >
                <option value="">Select project</option>
                {projectOptions.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <select
                className="bg-neutral-800 rounded-xl p-3 outline-none border border-neutral-700"
                value={task}
                onChange={(e) => setTask(e.target.value)}
              >
                <option value="">Task (optional)</option>
                {availableTasks.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {status.active ? (
                <button
                  onClick={clockOut}
                  disabled={loading}
                  className="rounded-xl p-3 border border-red-500/50 hover:bg-red-500/10"
                >
                  ⏱️ Clock Out
                </button>
              ) : (
                <button
                  onClick={clockIn}
                  disabled={loading}
                  className="rounded-xl p-3 border border-emerald-500/50 hover:bg-emerald-500/10"
                >
                  ▶️ Clock In
                </button>
              )}
            </div>
          </section>

          <aside className="bg-neutral-900/50 rounded-2xl p-5 border border-neutral-800">
            <h2 className="text-xl mb-2">This Week</h2>
            <div className="text-4xl font-bold">
              {totalHours}<span className="text-base font-normal ml-1">hrs</span>
            </div>
            <p className="text-neutral-400 text-sm">Total approved time</p>
          </aside>
        </div>
      )}

      {user?.token && (
        <section className="bg-neutral-900/50 rounded-2xl p-5 border border-neutral-800">
          <h2 className="text-xl mb-4">Recent Sessions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="text-left p-2">Day</th>
                  <th className="text-left p-2">Project #</th>
                  <th className="text-left p-2">Task</th>
                  <th className="text-left p-2">In</th>
                  <th className="text-left p-2">Out</th>
                  <th className="text-left p-2">Min</th>
                </tr>
              </thead>
              <tbody>
                {entries.entries.map((r) => (
                  <tr key={r.ID} className="border-t border-neutral-800">
                    <td className="p-2">{r.Day}</td>
                    <td className="p-2">{r.ProjectNumber || ''}</td>
                    <td className="p-2">{r.Task}</td>
                    <td className="p-2">{isoToLocalTime(r.ClockInISO)}</td>
                    <td className="p-2">{isoToLocalTime(r.ClockOutISO)}</td>
                    <td className="p-2">{r.DurationMinutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!user?.token && (
        <section className="bg-neutral-900/30 rounded-2xl p-5 border border-neutral-800">
          <p className="text-neutral-300">Sign in with Google to start tracking time.</p>
          <p className="text-neutral-500 text-sm">
            (Dev mode: backend accepts an <code>email</code> field if you want to test without Google Sign‑In.)
          </p>
        </section>
      )}
    </div>
  )
}
