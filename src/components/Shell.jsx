import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../lib/api";

const GREETINGS = [
  "Let’s make something beautiful today.",
  "Small cuts, big story.",
  "Rolling… focus on what matters.",
  "Craft > speed. But both is best.",
  "Frame by frame, hour by hour.",
];

const ALLOWED_DOMAIN = "frame15.com";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")
    );
    return JSON.parse(jsonPayload);
  } catch { return {}; }
}

export default function Shell({ page, setPage, onEmail, children }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [idToken, setIdToken] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [error, setError] = useState("");
  const [who, setWho] = useState(null);

  const handleCredential = useCallback((resp) => {
    const token = resp?.credential;
    if (!token) { setError("No credential from Google."); return; }
    const payload = parseJwt(token);
    const em = (payload.email || "").toLowerCase();
    if (!em.endsWith("@"+ALLOWED_DOMAIN)) { setError(`Use your @${ALLOWED_DOMAIN} account`); return; }
    const profile = { email: em, name: payload.name || em, idToken: token };
    localStorage.setItem("f15:user", JSON.stringify(profile));
    setName(profile.name); setEmail(profile.email); setIdToken(profile.idToken);
    setShowLogin(false); setError("");
    window.dispatchEvent(new CustomEvent("f15:userchange", { detail: profile }));
  }, []);

  // seed UI + session
  useEffect(() => {
    const stored = localStorage.getItem("f15:user");
    if (stored) {
      const u = JSON.parse(stored);
      setName(u.name || ""); setEmail(u.email || ""); setIdToken(u.idToken || ""); setShowLogin(false);
    } else setShowLogin(true);
    const last = localStorage.getItem("f15:greet");
    let next = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    if (last && last === next) next = GREETINGS[(GREETINGS.indexOf(next) + 1) % GREETINGS.length];
    setGreeting(next); localStorage.setItem("f15:greet", next);
  }, []);

  // verify session with backend
  useEffect(() => {
    (async () => {
      if (!idToken) return;
      try {
        const w = await api.whoami();
        if (w && w.ok !== false) {
          setWho(w); setError(""); onEmail?.(w.email || email);
        } else throw new Error(w?.error || "Unknown");
      } catch (e) {
        setError(`Access error: ${String(e.message || e)}`); setWho(null); setShowLogin(true);
      }
    })();
  }, [idToken, email, onEmail]);

  // load GIS
  useEffect(() => {
    if (!showLogin) return;
    const old = document.getElementById("gis-sdk"); if (old) old.remove();
    const script = document.createElement("script");
    script.id = "gis-sdk"; script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.defer = true;
    script.onload = () => {
      if (!window.google || !GOOGLE_CLIENT_ID) { setError("Google sign-in not configured."); return; }
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential, auto_select: false, ux_mode: "popup" });
      const el = document.getElementById("gsi-btn");
      if (el) window.google.accounts.id.renderButton(el, { theme: "filled_black", size: "large", shape: "pill", type: "standard" });
    };
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch { /* ignore error */ } };
  }, [showLogin, handleCredential]);

  function logout(){
    localStorage.removeItem("f15:user");
    setWho(null); setEmail(""); setName(""); setIdToken(""); setShowLogin(true);
  }

  const tabs = useMemo(() => ([
    { id: "work", label: "Work" },
    { id: "projects", label: "Projects" },
    { id: "insights", label: "Insights" },
  ]), []);
  const isAdmin = (who?.role || "").toLowerCase() === "admin";

  return (
    <div className="min-h-screen">
      {/* Top chrome */}
      <div className="sticky top-0 z-20 border-b" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-7 h-7 rounded-xl" style={{ background: "linear-gradient(135deg, #2563eb, #ef4444)" }}></div>
              </div>
              <div className="text-lg font-bold tracking-tight">Frame 15 Internal</div>
              <nav className="hidden md:flex gap-1 ml-2">
                {tabs.map(t => (
                  <button key={t.id}
                    onClick={()=>setPage(t.id)}
                    className={`f15-btn ${page===t.id ? "bg-white text-black border-white" : "f15-btn--ghost"}`}>
                    {t.label}
                  </button>
                ))}
                {isAdmin && <span className="ml-2 f15-badge" style={{ borderColor: "var(--blue)", color:"#c7d2fe" }}>Admin</span>}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-sm text-neutral-300">
                {greeting} {name && <span className="font-medium">— {name}</span>}
              </div>
              {email && <button className="f15-btn" onClick={logout} title={`Signed in as ${email}`}>Logout</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Hero strip */}
      <div className="border-b" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="f15-card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="f15-h1">Everything in one frame.</div>
                <div className="text-sm text-neutral-300">Time, projects, tasks & insights — fast, simple, elegant.</div>
              </div>
              <div className="flex gap-2">
                <button className="f15-btn f15-btn--blue" onClick={()=>setPage("projects")}>New Project</button>
                <button className="f15-btn">Quick Task</button>
                <button className="f15-btn">Weekly Report</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error surface */}
      {error && !showLogin && (
        <div className="max-w-7xl mx-auto mt-4 px-4">
          <div className="bg-red-500/15 border border-red-500/40 text-red-300 rounded-xl px-4 py-2 text-sm">{error}</div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>

      {/* Sign-in overlay */}
      {showLogin && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="f15-card w-full max-w-md space-y-5">
            <div className="text-center">
              <div className="inline-block w-12 h-12 rounded-2xl mb-2" style={{ background: "linear-gradient(135deg,#2563eb,#ef4444)" }}></div>
              <h2 className="f15-h2">Sign in</h2>
              <p className="text-sm text-neutral-300">Use your <b>@{ALLOWED_DOMAIN}</b> Google account.</p>
            </div>
            {error && <div className="text-red-300 text-sm">{error}</div>}
            <div id="gsi-btn" className="flex justify-center"></div>
          </div>
        </div>
      )}
    </div>
  );
}
