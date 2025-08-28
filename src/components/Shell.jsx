import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const GREETINGS = [
  "Let’s make something beautiful today.",
  "Small cuts, big story.",
  "Rolling… focus on what matters.",
  "Craft > speed. But both is best.",
  "Frame by frame, hour by hour.",
];
const ALLOWED_DOMAIN = "frame15.com";

export default function Shell({ page, setPage, onEmail, children }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [error, setError] = useState("");
  const [who, setWho] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("f15:user");
    if (stored) {
      const u = JSON.parse(stored);
      setName(u.name || "");
      setEmail(u.email || "");
    } else {
      setShowLogin(true);
    }
    const last = localStorage.getItem("f15:greet");
    let next = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    if (last && last === next) next = GREETINGS[(GREETINGS.indexOf(next) + 1) % GREETINGS.length];
    setGreeting(next);
    localStorage.setItem("f15:greet", next);
  }, []);

  useEffect(() => {
    (async () => {
      if (!email) return;
      try {
        const w = await api.whoami();
        if (w && w.ok !== false) {
          setWho(w);
          setError("");
          onEmail?.(email);
        }
      } catch (e) {
        setError(`Access error: ${String(e.message || e)}`);
        setWho(null);
        setShowLogin(true);
      }
    })();
  }, [email, onEmail]);

  function saveUser(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const display = String(f.get("display") || "").trim();
    const em = String(f.get("email") || "").trim();
    if (!em || !em.toLowerCase().endsWith("@" + ALLOWED_DOMAIN)) {
      setError(`Use your @${ALLOWED_DOMAIN} email`);
      return;
    }
    const payload = { email: em, name: display || em };
    localStorage.setItem("f15:user", JSON.stringify(payload));
    setName(payload.name);
    setEmail(payload.email);
    setShowLogin(false);
    setError("");
    window.dispatchEvent(new CustomEvent("f15:userchange", { detail: payload }));
  }

  function logout() {
    localStorage.removeItem("f15:user");
    setWho(null); setEmail(""); setName("");
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
            {email && (
              <button className="f15-btn" onClick={logout} title={`Signed in as ${email}`}>Logout</button>
            )}
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
          <form onSubmit={saveUser} className="f15-card w-full max-w-md space-y-3">
            <h2 className="f15-h2">Welcome to Frame 15 Internal</h2>
            <p className="text-sm text-neutral-600">Sign in with your <b>@{ALLOWED_DOMAIN}</b> email.</p>
            <input name="display" placeholder="Display name (optional)" className="f15-input" />
            <input name="email" type="email" required placeholder={"you@" + ALLOWED_DOMAIN} className="f15-input" />
            {error && <div className="text-rose-600 text-sm">{error}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowLogin(false)} className="f15-btn">View only</button>
              <button className="f15-btn f15-btn--primary">Enter</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
