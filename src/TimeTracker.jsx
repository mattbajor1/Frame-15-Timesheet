import { useEffect, useMemo, useState } from 'react'
import { useAuth, SignInButton } from './auth.jsx'
import Select from './components/Select.jsx'
import { Card, SectionTitle, Button, Badge } from './components/ui.jsx'

const API_BASE = '/.netlify/functions/time-api'

// never throw; always return { ok, data | error }
async function safeFetch(token, url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  try {
    const res = await fetch(url, { ...opts, headers })
    const ct = (res.headers.get('content-type') || '').toLowerCase()
    if (!ct.includes('application/json')) {
      const t = await res.text()
      return { ok: false, error: `Non-JSON from server (${res.status})`, snippet: t.slice(0, 300) }
    }
    const json = await res.json()
    if (!res.ok || json?.ok === false) return { ok: false, error: json?.error || 'Request failed' }
    return { ok: true, data: json }
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' }
  }
}

function useWeekStartToday() {
  return useMemo(() => {
    const d = new Date()
    const dow = d.getDay()
    const diff = (dow === 0 ? -6 : 1) - dow
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }, [])
}

export default function TimeTracker() {
  const { token, profile } = useAuth() || {}
  const weekToday = useWeekStartToday()

  // page state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [meta, setMeta] = useState({ user: null, projects: [], tasksMap: {} })
  const [status, setStatus] = useState({ active: false })
  const [weekStart, setWeekStart] = useState(weekToday)
  const [entries, setEntries] = useState({ entries: [], totalMinutes: 0 })

  const [tab, setTab] = useState('now') // 'now' | 'timers'
  const [timers, setTimers] = useState([])

  // selection (optional)
  const [selProject, setSelProject] = useState('')
  const [selTask, setSelTask] = useState('')
  const tasksForSelProject = meta?.tasksMap?.[String(selProject)] || []

  // initial load after sign-in
  useEffect(() => {
    if (!token) return
    setLoading(true); setError("")
    ;(async () => {
      const m = await safeFetch(token, `${API_BASE}?action=meta`)
      if (!m.ok) { setError(`meta: ${m.error}`); setLoading(false); return }
      setMeta({
        user: m.data.user || null,
        projects: Array.isArray(m.data.projects) ? m.data.projects : [],
        tasksMap: m.data.tasksMap || {}
      })

      const s = await safeFetch(token, `${API_BASE}?action=status`)
      if (!s.ok) { setError(`status: ${s.error}`); setLoading(false); return }
      setStatus(s.data)

      const e = await safeFetch(token, `${API_BASE}?action=entries&week=${weekToday}`)
      if (!e.ok) { setError(`entries: ${e.error}`); setLoading(false); return }
      setEntries(e.data)

      const t = await safeFetch(token, `${API_BASE}?action=list-timers`)
      if (!t.ok) { setError(`timers: ${t.error}`); setLoading(false); return }
      setTimers(Array.isArray(t.data.timers) ? t.data.timers : [])
      setLoading(false)
    })()
  }, [token, weekToday])

  useEffect(() => { setSelTask('') }, [selProject])

  async function refreshAll() {
    setError("")
    const [s, e, t] = await Promise.all([
      safeFetch(token, `${API_BASE}?action=status`),
      safeFetch(token, `${API_BASE}?action=entries&week=${weekStart || weekToday}`),
      safeFetch(token, `${API_BASE}?action=list-timers`),
    ])
    if (s.ok) setStatus(s.data); else setError(prev => prev || `status: ${s.error}`)
    if (e.ok) setEntries(e.data); else setError(prev => prev || `entries: ${e.error}`)
    if (t.ok) setTimers(Array.isArray(t.data.timers) ? t.data.timers : []); else setError(prev => prev || `timers: ${t.error}`)
  }

  async function clockInQuick() {
    if (status.active) return
    setLoading(true); setError("")
    const r = await safeFetch(token, `${API_BASE}?action=clockin`, { method: 'POST', body: JSON.stringify({}) })
    if (!r.ok) setError(`clockin: ${r.error}`)
    await refreshAll()
    setLoading(false)
  }

  async function clockInSelected() {
    if (status.active) return
    setLoading(true); setError("")
    const r = await safeFetch(token, `${API_BASE}?action=clockin`, {
      method: 'POST',
      body: JSON.stringify({ ProjectNumber: selProject || '', TaskName: selTask || '' })
    })
    if (!r.ok) setError(`clockin: ${r.error}`)
    setSelProject(''); setSelTask('')
    await refreshAll()
    setLoading(false)
  }

  async function clockOut() {
    if (!status.active) return
    setLoading(true); setError("")
    const r = await safeFetch(token, `${API_BASE}?action=clockout`, { method: 'POST', body: JSON.stringify({}) })
    if (!r.ok) setError(`clockout: ${r.error}`)
    await refreshAll()
    setLoading(false)
  }

  // timers
  const [newTimer, setNewTimer] = useState({ Label: '', ProjectNumber: '', TaskName: '' })
  async function createTimer() {
    if (!newTimer.Label) { setError("Please give the timer a label"); return }
    const r = await safeFetch(token, `${API_BASE}?action=create-timer`, { method: 'POST', body: JSON.stringify(newTimer) })
    if (!r.ok) { setError(`create-timer: ${r.error}`); return }
    setNewTimer({ Label: '', ProjectNumber: '', TaskName: '' })
    await refreshAll()
  }
  async function deleteTimer(id) {
    const r = await safeFetch(token, `${API_BASE}?action=delete-timer`, { method: 'POST', body: JSON.stringify({ TimerID: id }) })
    if (!r.ok) { setError(`delete-timer: ${r.error}`); return }
    await refreshAll()
  }
  async function startTimer(t) {
    if (status.active) { setError("Already clocked in."); return }
    const r = await safeFetch(token, `${API_BASE}?action=clockin`, {
      method: 'POST',
      body: JSON.stringify({ ProjectNumber: t.ProjectNumber || '', TaskName: t.TaskName || '' })
    })
    if (!r.ok) { setError(`clockin: ${r.error}`); return }
    await refreshAll()
  }

  const signedIn = Boolean(token)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Time</h1>
        {!signedIn ? <SignInButton id="gsi-btn-time" /> :
          <span className="text-sm text-neutral-400">Signed in as <b>{profile?.email}</b></span>}
      </header>

      {error && (
        <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-900/20 text-amber-200 text-sm">
          {error}
        </div>
      )}

      {/* Not signed in */}
      {!signedIn && (
        <Card><div className="text-sm text-neutral-300">Please sign in to track time.</div></Card>
      )}

      {/* Main content */}
      {signedIn && (
        <>
          <Card>
            <SectionTitle right={<Badge tone={status.active ? 'good' : 'neutral'}>
              {status.active ? 'Active' : 'Idle'}
            </Badge>}>Now</SectionTitle>

            {status.active ? (
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm text-neutral-400">Since</div>
                  <div className="text-lg">
                    {status?.session?.ClockInISO ? new Date(status.session.ClockInISO).toLocaleString() : '—'}
                  </div>
                  <div className="text-sm text-neutral-400 mt-1">
                    {status?.session?.ProjectNumber ? <>Project <b>#{status.session.ProjectNumber}</b> — </> : null}
                    {status?.session?.Task ? <>Task <b>{status.session.Task}</b></> : <i className="text-neutral-500">No task</i>}
                  </div>
                </div>
                <Button variant="danger" onClick={clockOut} disabled={loading}>⏹ Clock Out</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Button onClick={clockInQuick} disabled={loading}>▶ Quick Clock In</Button>
                  <span className="text-sm text-neutral-400">No selections needed. You can assign later.</span>
                </div>

                <div className="mt-5 grid sm:grid-cols-3 gap-3">
                  <Select
                    label="Project"
                    value={selProject}
                    onChange={v => setSelProject(v)}
                    options={(meta.projects || []).map(p => ({ value: String(p.number || ''), label: `#${p.number} — ${p.name || '(no name)'}` }))}
                    placeholder="Choose a project (optional)"
                  />
                  <Select
                    label="Task"
                    value={selTask}
                    onChange={v => setSelTask(v)}
                    options={tasksForSelProject}
                    placeholder={selProject ? "Choose a task (optional)" : "Pick a project first (optional)"}
                    disabled={!selProject}
                  />
                  <div className="flex items-end">
                    <Button onClick={clockInSelected} disabled={loading}>▶ Start with Selection</Button>
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card className="mt-6">
            <div className="flex items-center gap-4 text-sm">
              <button className={tab === 'now' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'} onClick={() => setTab('now')}>This Week</button>
              <button className={tab === 'timers' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'} onClick={() => setTab('timers')}>Timers</button>
            </div>

            {tab === 'now' ? (
              <div className="mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm text-neutral-400">Week starting</label>
                  <input type="date" className="bg-neutral-800 rounded-xl p-2 border border-neutral-700"
                         value={weekStart || ''} onChange={async (e) => {
                           setWeekStart(e.target.value)
                           const e2 = await safeFetch(token, `${API_BASE}?action=entries&week=${e.target.value}`)
                           if (e2.ok) setEntries(e2.data); else setError(`entries: ${e2.error}`)
                         }}/>
                  <Badge tone="neutral">{(entries.totalMinutes / 60).toFixed(1)} hrs</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-neutral-400">
                      <tr>
                        <th className="p-2 text-left">Day</th>
                        <th className="p-2 text-left">Project</th>
                        <th className="p-2 text-left">Task</th>
                        <th className="p-2 text-left">Start</th>
                        <th className="p-2 text-left">End</th>
                        <th className="p-2 text-right">Minutes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(entries.entries || []).map((r, i) => (
                        <tr key={i} className="border-t border-neutral-800 hover:bg-neutral-900/40">
                          <td className="p-2">{r.Day}</td>
                          <td className="p-2">{r.ProjectNumber ? `#${r.ProjectNumber}` : ''} {r.Project}</td>
                          <td className="p-2">{r.Task}</td>
                          <td className="p-2">{r.ClockInISO ? new Date(r.ClockInISO).toLocaleTimeString() : ''}</td>
                          <td className="p-2">{r.ClockOutISO ? new Date(r.ClockOutISO).toLocaleTimeString() : ''}</td>
                          <td className="p-2 text-right">{r.DurationMinutes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                <div className="grid sm:grid-cols-4 gap-3">
                  <label className="grid gap-1 text-sm">
                    <span className="text-neutral-300">Label</span>
                    <input className="bg-neutral-800 rounded-xl p-3 border border-neutral-700" placeholder="Design, Emails, Editing…" value={newTimer.Label} onChange={e => setNewTimer({ ...newTimer, Label: e.target.value })}/>
                  </label>
                  <Select label="Project" value={newTimer.ProjectNumber} onChange={v => setNewTimer({ ...newTimer, ProjectNumber: v })}
                          options={(meta.projects || []).map(p => ({ value: String(p.number || ''), label: `#${p.number} — ${p.name || '(no name)'}` }))} placeholder="(optional)"/>
                  <label className="grid gap-1 text-sm">
                    <span className="text-neutral-300">Task (optional)</span>
                    <input className="bg-neutral-800 rounded-xl p-3 border border-neutral-700" placeholder="e.g., Color grade" value={newTimer.TaskName} onChange={e => setNewTimer({ ...newTimer, TaskName: e.target.value })}/>
                  </label>
                  <div className="flex items-end">
                    <Button onClick={createTimer}>➕ Save Timer</Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(timers || []).map(t => (
                    <div key={t.TimerID} className="border border-neutral-800 rounded-xl p-4">
                      <div className="text-sm font-medium">{t.Label}</div>
                      <div className="text-xs text-neutral-400 mt-1">
                        {t.ProjectNumber ? `#${t.ProjectNumber}` : 'No project'} {t.TaskName ? `• ${t.TaskName}` : ''}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button onClick={() => startTimer(t)}>▶ Start</Button>
                        <Button variant="subtle" onClick={() => deleteTimer(t.TimerID)}>🗑 Delete</Button>
                      </div>
                    </div>
                  ))}
                  {(timers || []).length === 0 && <div className="text-sm text-neutral-400">No timers yet — add one above.</div>}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
