// src/components/Shell.jsx
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Shell({ page, setPage, onEmail, children }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const u = localStorage.getItem("f15:user");
      if (u) {
        const e = JSON.parse(u)?.email || "";
        setEmail(e);
        onEmail?.(e);
      }
    } catch { /* empty */ }
  }, [onEmail]);

  async function signIn(e) {
    e?.preventDefault();
    setError("");
    const em = (new FormData(e.target).get("email") || "").toString().trim().toLowerCase();
    if (!em) { setError("Enter your work email"); return; }
    try {
      const who = await api.whoami(em);
      if (!who.allowed) { setError(`Only @${who.allowedDomain} accounts are allowed.`); return; }
      localStorage.setItem("f15:user", JSON.stringify({ email: em }));
      setEmail(em);
      onEmail?.(em);
    } catch (err) { setError(String(err?.message || err)); }
  }
  function signOut() {
    localStorage.removeItem("f15:user");
    setEmail("");
    onEmail?.("");
  }

  const NavButton = ({ id, label }) => (
    <button
      className={`px-3 py-2 rounded-xl border ${page === id ? "bg-black text-white" : "hover:bg-neutral-50"}`}
      onClick={() => setPage(id)}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <div className="font-bold">Frame-15 Internal</div>
          <div className="ml-2 flex items-center gap-2">
            <NavButton id="home" label="Home" />
            <NavButton id="projects" label="Projects" />
            <NavButton id="insights" label="Insights" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {email ? (
              <>
                <span className="text-sm text-neutral-400">{email}</span>
                <button className="f15-btn" onClick={signOut}>Sign out</button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {email ? children : (
          <div className="f15-card max-w-md mx-auto">
            <div className="text-xl font-semibold mb-2">Sign in</div>
            <p className="text-sm text-neutral-400 mb-4">Use your work email (@frame15.com).</p>
            <form onSubmit={signIn} className="grid gap-3">
              <input className="f15-input" name="email" type="email" placeholder="you@frame15.com" />
              <button className="f15-btn f15-btn--primary" type="submit">Continue</button>
            </form>
            {error && <div className="text-red-500 text-sm mt-3">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
