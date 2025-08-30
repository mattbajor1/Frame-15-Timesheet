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
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

export default function Shell({ page, setPage, onEmail, children }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [idToken, setIdToken] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [error, setError] = useState("");
  const [who, setWho] = useState(null);

  // Stable callback for Google credential response
  const handleCredential = useCallback((resp) => {
    const token = resp?.credential;
    if (!token) { setError("No credential from Google."); return; }
    const payload = parseJwt(token);
    const em = (payload.email || "").toLowerCase();
    if (!em.endsWith("@"+ALLOWED_DOMAIN)) {
      setError(`Use your @${ALLOWED_DOMAIN} account`);
      return;
    }
    const profile = { email: em, name: payload.name || em, idToken: token };
    localStorage.setItem("f15:user", JSON.stringify(profile));
    setName(profile.name);
    setEmail(profile.email);
    setIdToken(profile.idToken);
    setShowLogin(false);
    setError("");
    window.dispatchEvent(new CustomEvent("f15:userchange", { detail: profile }));
  }, []);

  // Load stored session + greeting
  useEffect(() => {
    const stored = localStorage.getItem("f15:user");
    if (stored) {
      const u = JSON.parse(stored);
      setName(u.name || "");
      setEmail(u.email || "");
      setIdToken(u.idToken || "");
      setShowLogin(false);
    } else {
      setShowLogin(true);
    }
    const last = localStorage.getItem("f15:greet");
    let next = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    if (last && last === next) next = GREETINGS[(GREETINGS.indexOf(next) + 1) % GREETINGS.length];
    setGreeting(next);
    localStorage.setItem("f15:greet", next);
  }, []);

  // Verify session with backend
  useEffect(() => {
    (async () => {
      if (!idToken) return;
      try {
        const w = await api.whoami();
        if (w && w.ok !== false) {
          setWho(w);
          setError("");
          onEmail?.(w.email || email);
        } else {
          throw new Error(w?.error || "Unknown");
        }
      } catch (e) {
        setError(`Access error: ${String(e.message || e)}`);
        setWho(null);
        setShowLogin(true);
      }
    })();
  }, [idToken, email, onEmail]);

  // Load Google Identity Services and render the button
  useEffect(() => {
    if (!showLogin) return;

    // avoid duplicate script
    const existing = document.getElementById("gis-sdk");
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = "gis-sdk";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (!window.google || !GOOGLE_CLIENT_ID) {
        setError("Google sign-in not configured.");
        return;
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
        ux_mode: "popup",
        cancel_on_tap_outside: true,
      });
      const el = document.getElementById("gsi-btn");
      if (el) {
        window.google.accounts.id.renderButton(el, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "pill",
          logo_alignment: "left",
        });
      }
    };

    document.head.appendChild(script);
    return () => {
      try { document.head.removeChild(script); } catch { /* ignore error */ }
    };
  }, [showLogin, handleCredential]);

  function logout() {
    localStorage.removeItem("f15:user");
    setWho(null); setEmail(""); setName(""); setIdToken("");
    setShowLogin(true);
  }

  const tabs = useMemo(() => ([
    { id: "work", label: "Work" },
    { id: "projects", label: "Projects" },
    { id: "insights", label: "Insights" },
  ]), []);

  const isAdmin = (who?.role || "").toLowerCase() === "admin";

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold tracking-tight">Frame 15 Internal</div>
            <nav className="hidden sm:flex gap-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPage(t.id)}
                  className={`f15-btn ${page === t.id ? "bg-black text-white border-black" : ""}`}
                >
                  {t.label}
                </button>
              ))}
              {isAdmin && <span className="ml-2 f15-badge text-blue-700" style={{ borderColor: "var(--blue)" }}>Admin</span>}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-neutral-600">
              {greeting} {name && <span className="font-medium">— {name}</span>}
            </div>
            {email && <button className="f15-btn" onClick={logout} title={`Signed in as ${email}`}>Logout</button>}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && !showLogin && (
        <div className="max-w-6xl mx-auto mt-4 px-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-4 py-2 text-sm">{error}</div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-6">{children}</main>

      {/* Login gate */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="f15-card w-full max-w-md space-y-4">
            <h2 className="f15-h2">Sign in</h2>
            <p className="text-sm text-neutral-600">Use your <b>@{ALLOWED_DOMAIN}</b> Google account.</p>
            {error && <div className="text-rose-600 text-sm">{error}</div>}
            <div id="gsi-btn" className="flex justify-center"></div>
          </div>
        </div>
      )}
    </div>
  );
}
