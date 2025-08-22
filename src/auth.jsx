import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthCtx = createContext({ token: null, profile: null, signOut: () => {}, promptSignIn: () => {} })

function decodeJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [profile, setProfile] = useState(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  useEffect(() => {
    // restore previous session
    const t = sessionStorage.getItem('g_id_token')
    if (t) {
      const payload = decodeJwt(t)
      if (payload && payload.exp * 1000 > Date.now() + 60 * 1000) {
        setToken(t)
        setProfile({ email: payload.email, name: payload.name })
      } else {
        sessionStorage.removeItem('g_id_token')
      }
    }

    // load google identity once
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      if (!clientId) return
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => {
          setToken(resp.credential)
          sessionStorage.setItem('g_id_token', resp.credential)
          const payload = decodeJwt(resp.credential)
          setProfile({ email: payload?.email, name: payload?.name })
        },
        auto_select: true,
        itp_support: true,
        use_fedcm_for_prompt: true,
      })
      // if the user is already signed into Google in the browser, this will reuse it
      window.google?.accounts.id.prompt()
    }
    document.body.appendChild(script)
    return () => { script.remove() }
  }, [clientId])

  const value = useMemo(() => ({
    token,
    profile,
    signOut: () => {
      sessionStorage.removeItem('g_id_token')
      setToken(null); setProfile(null)
      window.google?.accounts.id.disableAutoSelect?.()
    },
    promptSignIn: () => window.google?.accounts.id.prompt?.()
  }), [token, profile])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}

export function SignInButton({ id = 'gsi-btn', text = 'Sign in with Google' }) {
  useEffect(() => {
    if (window.google?.accounts?.id) {
      const el = document.getElementById(id)
      if (el && el.childElementCount === 0) {
        window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large' })
      }
    }
  })
  return <div id={id} className="inline-block px-4 py-2 rounded border border-neutral-700 text-sm">{text}</div>
}