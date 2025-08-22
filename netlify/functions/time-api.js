// netlify/functions/time-api.js
const { google } = require('googleapis')
const { OAuth2Client } = require('google-auth-library')

// ─── Env ───────────────────────────────────────────────────────────────────────
const SHEET_ID = process.env.GOOGLE_SHEET_ID

// Frontend (for verifying the user's ID token)
const OAUTH_CLIENT_ID = process.env.GOOGLE_CLIENT_ID

// Server-side OAuth to call Sheets (no service account / no private key)
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const OAUTH_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN

// Allowlist
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || '').toLowerCase()

function isAllowed(email) {
  const e = (email || '').toLowerCase()
  if (!e) return false
  if (ALLOWED_EMAILS.includes(e)) return true
  if (ALLOWED_EMAIL_DOMAIN && e.endsWith('@' + ALLOWED_EMAIL_DOMAIN)) return true
  return false
}

// Basic env sanity (prints in Netlify logs if something is missing)
;[['GOOGLE_SHEET_ID', SHEET_ID],
  ['GOOGLE_CLIENT_ID', OAUTH_CLIENT_ID],
  ['GOOGLE_CLIENT_SECRET', OAUTH_CLIENT_SECRET],
  ['GOOGLE_REFRESH_TOKEN', OAUTH_REFRESH_TOKEN],
].forEach(([name, val]) => { if (!val) console.warn(`Missing ${name}`) })

// ─── Google clients ────────────────────────────────────────────────────────────
// ID token verifier for the browser session
const oauthClient = new OAuth2Client(OAUTH_CLIENT_ID)

// OAuth2 client (uses your refresh token to mint access tokens to call Sheets)
const oauth2 = new google.auth.OAuth2(OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET)
oauth2.setCredentials({ refresh_token: OAUTH_REFRESH_TOKEN })

const sheets = google.sheets({ version: 'v4', auth: oauth2 })

// ─── Helpers ───────────────────────────────────────────────────────────────────
const cors = (body, statusCode = 200, headers = {}) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    ...headers,
  },
  body: JSON.stringify(body),
})

async function verifyAndGetEmail(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.split(' ')[1]
    const ticket = await oauthClient.verifyIdToken({ idToken: token, audience: OAUTH_CLIENT_ID })
    const payload = ticket.getPayload()
    return { email: payload.email, name: payload.name || '' }
  }
  // Dev fallback (optional): POST { email }
  try {
    const body = event.body ? JSON.parse(event.body) : {}
    if (body.email) return { email: body.email, name: body.name || '' }
  } catch {}
  return null
}

async function readRange(range) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range })
  return res.data.values || []
}
async function appendRow(range, row) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  })
}
async function writeRange(range, values) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  })
}
function nowISO() { return new Date().toISOString() }

// ─── Settings ──────────────────────────────────────────────────────────────────
async function getSettings() {
  const rows = await readRange('Settings!A:B')
  const kv = {}
  rows.forEach(([k, v]) => { if (k) kv[k] = v })
  const split = key => (kv[key] ? kv[key].split(',').map(s=>s.trim()).filter(Boolean) : [])
  const nextStart = parseInt(kv['NextProjectStart'] || '1000', 10) || 1000
  return {
    raw: kv,
    nextProjectStart: nextStart,
    priorities: split('Priorities'),
    statuses: split('Statuses'),
    stages: split('Stages'),
    riskLevels: split('RiskLevels'),
    health: split('HealthStatuses'),
  }
}

// ─── Projects ──────────────────────────────────────────────────────────────────
const PROJECT_HEADERS = [
  "ProjectNumber","ProjectName","ClientName","ClientID","Priority","Status","Stage","Health",
  "ProjectManagerEmail","OwnerEmail",
  "StartDate","DueDate","KickoffDate","InternalReviewDate","ClientReviewDate","DeliveryDate",
  "Budget","Currency","BillingModel","HourlyRate","PO_Number","InvoiceTerms",
  "BriefLink","StorageLink","EditLink","SlackChannel","DriveFolder","VimeoAlbum","OtherLinks",
  "Tags","ColorHex","RiskLevel","Notes","CreatedAtISO","UpdatedAtISO","Archived"
]
function rowToObj(row) {
  const obj = {}
  PROJECT_HEADERS.forEach((h, i) => obj[h] = row[i] || '')
  if (obj.ProjectNumber) obj.ProjectNumber = parseInt(obj.ProjectNumber, 10)
  return obj
}
async function ensureProjectHeaders() {
  const rows = await readRange('Projects!1:1')
  if ((rows[0] || []).length === 0) {
    await writeRange('Projects!1:1', [PROJECT_HEADERS])
  }
}
async function listProjects() {
  await ensureProjectHeaders()
  const rows = await readRange('Projects!A2:AJ')
  return rows.filter(r => r[0]).map(rowToObj)
}
async function nextProjectNumber() {
  const rows = await readRange('Projects!A:A')
  let maxNum = 999
  rows.forEach(r => { const n = parseInt(r[0], 10); if (!isNaN(n) && n > maxNum) maxNum = n })
  const settings = await getSettings()
  return Math.max(maxNum, settings.nextProjectStart - 1) + 1
}
async function createProject(payload) {
  await ensureProjectHeaders()
  const num = await nextProjectNumber()
  const now = nowISO()
  const map = (name) => (payload[name] ?? '')
  const row = [
    num,
    map('ProjectName'), map('ClientName'), map('ClientID'),
    map('Priority') || 'P2 Medium', map('Status') || 'Planning', map('Stage') || 'Discovery',
    map('Health') || 'On Track',
    map('ProjectManagerEmail'), map('OwnerEmail'),
    map('StartDate'), map('DueDate'), map('KickoffDate'), map('InternalReviewDate'), map('ClientReviewDate'), map('DeliveryDate'),
    map('Budget'), map('Currency') || 'USD', map('BillingModel') || 'Hourly', map('HourlyRate'),
    map('PO_Number'), map('InvoiceTerms'),
    map('BriefLink'), map('StorageLink'), map('EditLink'),
    map('SlackChannel'), map('DriveFolder'), map('VimeoAlbum'), map('OtherLinks'),
    map('Tags'), map('ColorHex'), map('RiskLevel') || 'Low', map('Notes'),
    now, now, map('Archived') ? 'Yes' : ''
  ]
  await appendRow('Projects!A:AJ', row)
  return { projectNumber: num }
}
async function updateProject(payload) {
  const num = parseInt(payload.ProjectNumber, 10)
  if (!num) throw new Error('Missing ProjectNumber')
  const rows = await readRange('Projects!A:AJ')
  const header = rows[0] || PROJECT_HEADERS
  let idx = -1
  for (let i = 1; i < rows.length; i++) {
    if (parseInt(rows[i][0], 10) === num) { idx = i; break }
  }
  if (idx === -1) throw new Error('Project not found')
  const row = rows[idx]
  const colIndex = Object.fromEntries(header.map((h,i)=>[h,i]))
  Object.keys(payload).forEach(k => {
    if (k === 'ProjectNumber') return
    const ci = colIndex[k]
    if (ci !== undefined) row[ci] = payload[k]
  })
  const updatedIdx = colIndex['UpdatedAtISO']
  if (updatedIdx !== undefined) row[updatedIdx] = nowISO()
  const range = `Projects!A${idx+1}:AJ${idx+1}`
  await writeRange(range, [row])
  return { ok: true }
}

// ─── Tasks ─────────────────────────────────────────────────────────────────────
const TASK_HEADERS = [
  "TaskID","ProjectNumber","TaskName","AssigneeEmail","Role","Priority","Status","Milestone",
  "StartDate","DueDate","EstimatedHours","ActualHours","PercentComplete",
  "DependsOnTaskIDs","ExternalDependency","Billable","HourlyRateOverride","CostOverride",
  "Location","Notes","CreatedAtISO","UpdatedAtISO","Tags"
]
async function ensureTaskHeaders() {
  const rows = await readRange('Tasks!1:1')
  if ((rows[0] || []).length === 0) {
    await writeRange('Tasks!1:1', [TASK_HEADERS])
  }
}
function newId() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
async function listTasks(projectNumber) {
  await ensureTaskHeaders()
  const rows = await readRange('Tasks!A2:W')
  return rows
    .map(r => ({
      TaskID: r[0] || '',
      ProjectNumber: r[1] ? parseInt(r[1],10) : '',
      TaskName: r[2] || '',
      AssigneeEmail: r[3] || '',
      Status: r[6] || '',
      DueDate: r[9] || '',
    }))
    .filter(t => !projectNumber || String(t.ProjectNumber) === String(projectNumber))
}
async function createTask(payload) {
  await ensureTaskHeaders()
  const now = nowISO()
  const taskId = newId()
  const row = [
    taskId,
    payload.ProjectNumber || '',
    payload.TaskName || '',
    payload.AssigneeEmail || '',
    payload.Role || '',
    payload.Priority || '',
    payload.Status || 'Backlog',
    payload.Milestone || '',
    payload.StartDate || '',
    payload.DueDate || '',
    payload.EstimatedHours || '',
    payload.ActualHours || '',
    payload.PercentComplete || '',
    payload.DependsOnTaskIDs || '',
    payload.ExternalDependency || '',
    payload.Billable || '',
    payload.HourlyRateOverride || '',
    payload.CostOverride || '',
    payload.Location || '',
    payload.Notes || '',
    now,
    now,
    payload.Tags || ''
  ]
  await appendRow('Tasks!A:W', row)
  return { taskId }
}

// ─── Users / Meta / Time ───────────────────────────────────────────────────────
async function getUsers() {
  const rows = await readRange('Users!A:C')
  const out = {}
  rows.forEach(([email, name, color]) => {
    if (email) out[email.toLowerCase()] = { name: name || '', color: color || '' }
  })
  return out
}
async function ensureUser(email, name) {
  const users = await getUsers()
  const key = email.toLowerCase()
  if (!users[key]) {
    const palette = ['#8B5CF6','#22C55E','#EAB308','#06B6D4','#F97316','#A855F7','#14B8A6','#F43F5E']
    const color = palette[Math.floor(Math.random() * palette.length)]
    await appendRow('Users!A:C', [email, name || '', color])
    return { name: name || '', color }
  }
  return users[key]
}
async function getProjectsForMeta() {
  const rows = await readRange('Projects!A:B')
  return rows.slice(1).filter(r => r[0] && r[1]).map(r => ({ number: parseInt(r[0],10), name: r[1] }))
}
async function getTasksMap() {
  const rows = await readRange('Tasks!A:C')
  const map = {}
  rows.slice(1).forEach(([taskId, projNum, task]) => {
    if (!projNum || !task) return
    const key = String(projNum)
    if (!map[key]) map[key] = []
    map[key].push(task)
  })
  return map
}
function mondayOf(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}
function ymd(date = new Date()) { return new Date(date).toISOString().slice(0, 10) }
async function getTimeLog() {
  const rows = await readRange('TimeLog!A:L')
  const headers = ['ID','Email','Name','ProjectNumber','Project','Task','ClockInISO','ClockOutISO','DurationMinutes','WeekStart','Day','Billable']
  return rows.slice(1).map(r => Object.fromEntries(headers.map((h,i)=>[h, r[i] || ''])))
}
async function findActiveRowIndex(email) {
  const rows = await readRange('TimeLog!A:L')
  for (let i = rows.length - 1; i >= 1; i--) {
    const row = rows[i]
    const [ID, Email,, , , , ClockInISO, ClockOutISO] = row
    if ((Email || '').toLowerCase() === email.toLowerCase() && !ClockOutISO) return i + 1
  }
  return null
}
async function handleMeta(email, name) {
  const user = await ensureUser(email, name)
  const [projects, tasksMap] = await Promise.all([getProjectsForMeta(), getTasksMap()])
  return { user, projects, tasksMap }
}
async function handleStatus(email) {
  const rows = await readRange('TimeLog!A:L')
  for (let i = rows.length - 1; i >= 1; i--) {
    const [ID, Email, Name, ProjectNumber, Project, Task, ClockInISO, ClockOutISO] = rows[i]
    if ((Email || '').toLowerCase() === email.toLowerCase() && !ClockOutISO) {
      return { active: true, session: { ID, Email, Name, ProjectNumber, Project, Task, ClockInISO } }
    }
  }
  return { active: false }
}
function newId() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
async function handleClockIn(email, name, body) {
  const status = await handleStatus(email)
  if (status.active) return { ok: false, error: 'Already clocked in.' }
  const now = new Date()
  const week = mondayOf(now)
  await ensureUser(email, name)
  const projectNumber = body.projectNumber || body.ProjectNumber || ''
  const project = body.project || ''
  const task = body.task || ''
  const row = [newId(), email, name || '', projectNumber, project, task, now.toISOString(), '', '', week, ymd(now), '']
  await appendRow('TimeLog!A:L', row)
  return { ok: true }
}
async function handleClockOut(email) {
  const idx = await findActiveRowIndex(email)
  if (!idx) return { ok: false, error: 'No active session.' }
  const range = `TimeLog!A${idx}:L${idx}`
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range })
  const row = res.data.values[0]
  const startISO = row[6]
  const end = new Date()
  const minutes = Math.max(0, Math.round((end - new Date(startISO)) / 60000))
  row[7] = end.toISOString()
  row[8] = minutes
  await writeRange(range, [row])
  return { ok: true, minutes }
}
async function handleEntries(email, sinceWeekStart = mondayOf(new Date())) {
  const all = await getTimeLog()
  const mine = all.filter(r => r.Email.toLowerCase() === email.toLowerCase() && r.WeekStart === sinceWeekStart)
  const total = mine.reduce((acc, r) => acc + (Number(r.DurationMinutes) || 0), 0)
  return { entries: mine, totalMinutes: total }
}

// ─── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({ ok: true })

  const action = (event.queryStringParameters?.action || '').toLowerCase()

  // auth
  const user = await verifyAndGetEmail(event)
  if (!user && action !== 'public-meta') {
    return cors({ ok: false, error: 'Unauthorized: missing or invalid Google ID token.' }, 401)
  }
  if (user && !isAllowed(user.email)) {
    return cors({ ok: false, error: 'Forbidden: not in allowlist.' }, 403)
  }

  try {
    if (event.httpMethod === 'GET') {
      if (action === 'meta') return cors({ ok: true, ...(await handleMeta(user.email, user.name)) })
      if (action === 'status') return cors({ ok: true, ...(await handleStatus(user.email)) })
      if (action === 'entries') {
        const week = event.queryStringParameters?.week || mondayOf(new Date())
        return cors({ ok: true, ...(await handleEntries(user.email, week)) })
      }
      if (action === 'get-settings') return cors(await getSettings())
      if (action === 'list-projects') return cors({ ok: true, projects: await listProjects() })
      if (action === 'list-tasks') {
        const proj = event.queryStringParameters?.projectNumber
        return cors({ ok: true, tasks: await listTasks(proj) })
      }
      // optional debug: check OAuth can mint an access token
      if (action === 'oauth-ping') {
        const token = await oauth2.getAccessToken()
        return cors({ ok: true, hasToken: !!token?.token })
      }
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      if (action === 'clockin') return cors(await handleClockIn(user.email, user.name, body))
      if (action === 'clockout') return cors(await handleClockOut(user.email))
      if (action === 'create-project') return cors(await createProject(body))
      if (action === 'update-project') return cors(await updateProject(body))
      if (action === 'create-task') return cors(await createTask(body))
    }

    return cors({ ok: false, error: 'Not found' }, 404)
  } catch (e) {
    console.error(e)
    return cors({ ok: false, error: e.message || 'Server error' }, 500)
  }
}
