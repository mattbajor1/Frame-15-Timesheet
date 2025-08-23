// netlify/functions/time-api.js — proxy to Apps Script, forwards user info
const { OAuth2Client } = require('google-auth-library')

const WEB_APP_URL = process.env.APPSCRIPT_URL
const API_KEY = process.env.APPSCRIPT_API_KEY
const OAUTH_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const REQUIRE_GOOGLE_LOGIN = (process.env.REQUIRE_GOOGLE_LOGIN ?? 'true') !== 'false'

// Allow anonymous health check for debugging
const PUBLIC_ACTIONS = new Set(['ping'])

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',').map(s=>s.trim().toLowerCase()).filter(Boolean)
const ALLOWED_EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || '').toLowerCase()

function isAllowed(email) {
  const e = (email || '').toLowerCase()
  if (!e) return false
  if (ALLOWED_EMAILS.includes(e)) return true
  if (ALLOWED_EMAIL_DOMAIN && e.endsWith('@' + ALLOWED_EMAIL_DOMAIN)) return true
  return false
}

const oauthClient = new OAuth2Client(OAUTH_CLIENT_ID)

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

async function getUser(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization
  if (auth && auth.startsWith('Bearer ')) {
    const token = auth.split(' ')[1]
    const ticket = await oauthClient.verifyIdToken({ idToken: token, audience: OAUTH_CLIENT_ID })
    const payload = ticket.getPayload()
    return { email: payload.email, name: payload.name || '' }
  }
  try {
    const body = event.body ? JSON.parse(event.body) : {}
    if (body.email) return { email: body.email, name: body.name || '' }
  } catch {}
  return null
}

async function forwardGet(params, user) {
  const sp = new URLSearchParams(params || {})
  sp.set('apiKey', API_KEY)
  if (user) { sp.set('email', user.email); sp.set('name', user.name || '') }
  const url = `${WEB_APP_URL}?${sp.toString()}`
  const r = await fetch(url, { method: 'GET' })
  const ct = (r.headers.get('content-type') || '').toLowerCase()
  if (ct.includes('application/json')) {
    const data = await r.json(); return { code: r.status, data }
  } else {
    const text = await r.text()
    return { code: 502, data: { ok:false, error:'Upstream returned non-JSON', upstreamStatus:r.status, contentType:ct, snippet:text.slice(0, 500) } }
  }
}

async function forwardPost(action, body, user) {
  const sp = new URLSearchParams({ action })
  const url = `${WEB_APP_URL}?${sp.toString()}`
  const r = await fetch(url, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ ...(body || {}), apiKey: API_KEY, email: user?.email, name: user?.name })
  })
  const ct = (r.headers.get('content-type') || '').toLowerCase()
  if (ct.includes('application/json')) {
    const data = await r.json(); return { code: r.status, data }
  } else {
    const text = await r.text()
    return { code: 502, data: { ok:false, error:'Upstream returned non-JSON', upstreamStatus:r.status, contentType:ct, snippet:text.slice(0, 500) } }
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({ ok: true })
  if (!WEB_APP_URL || !API_KEY) return cors({ ok:false, error:'Server not configured' }, 500)

  const action = (event.queryStringParameters?.action || '').toLowerCase()

  let user = null
  if (!PUBLIC_ACTIONS.has(action) && REQUIRE_GOOGLE_LOGIN) {
    user = await getUser(event)
    if (!user) return cors({ ok:false, error:'Unauthorized' }, 401)
    if (!isAllowed(user.email)) return cors({ ok:false, error:'Forbidden' }, 403)
  }

  try {
    if (event.httpMethod === 'GET') {
      const { code, data } = await forwardGet(event.queryStringParameters || {}, user)
      return cors(data, code)
    }
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      const { code, data } = await forwardPost(action, body, user)
      return cors(data, code)
    }
    return cors({ ok:false, error:'Not found' }, 404)
  } catch (e) {
    console.error(e)
    return cors({ ok:false, error: e.message || 'Server error' }, 500)
  }
}
