// netlify/functions/time-api.js — proxy to Apps Script
const { OAuth2Client } = require('google-auth-library')

// Env
const WEB_APP_URL = process.env.APPSCRIPT_URL // the Web app URL ending with /exec
const API_KEY = process.env.APPSCRIPT_API_KEY // same as Script Property API_KEY
const OAUTH_CLIENT_ID = process.env.GOOGLE_CLIENT_ID

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

async function verifyAndGetEmail(event) {
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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return cors({ ok: true })
  if (!WEB_APP_URL || !API_KEY) return cors({ ok:false, error:'Server not configured' }, 500)

  const action = (event.queryStringParameters?.action || '').toLowerCase()

  // verify Google Sign-In from the browser
  const user = await verifyAndGetEmail(event)
  if (!user && action !== 'public-meta') return cors({ ok:false, error:'Unauthorized' }, 401)
  if (user && !isAllowed(user.email)) return cors({ ok:false, error:'Forbidden' }, 403)

  try {
    // forward to Apps Script
    if (event.httpMethod === 'GET') {
      // forward query params and apiKey
      const sp = new URLSearchParams(event.queryStringParameters || {})
      sp.set('apiKey', API_KEY)
      const url = `${WEB_APP_URL}?${sp.toString()}`
      const r = await fetch(url, { method:'GET' })
      const data = await r.json()
      const code = r.ok ? 200 : (data && data.error ? 500 : r.status)
      return cors(data, code)
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {}
      // inject apiKey (not exposed to browser)
      body.apiKey = API_KEY
      const sp = new URLSearchParams({ action })
      const url = `${WEB_APP_URL}?${sp.toString()}`
      const r = await fetch(url, {
        method:'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(body),
      })
      const data = await r.json()
      const code = r.ok ? 200 : (data && data.error ? 500 : r.status)
      return cors(data, code)
    }

    return cors({ ok:false, error:'Not found' }, 404)
  } catch (e) {
    console.error(e)
    return cors({ ok:false, error: e.message || 'Server error' }, 500)
  }
}
