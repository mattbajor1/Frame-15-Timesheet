// src/components/Shell.jsx
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Shell({ page, setPage, onEmail, children }) {
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  // load cached user
  useEffect(() => {
    try {
      const u = localStorage.getItem("f15:user");
      if (u) {
        const e = JSON.parse(u)?.email || "";
        setEmail(e);
        onEmail?.(e);
      }
    } catch {
      // Ignore errors when loading cached user
    }
    setChecking(false);
  }, [onEmail]);

  async function signIn(e) {
    e?.preventDefault();
    setError("");
    const form = new FormData(e?.target || undefined);
    const em = (form.get("email") || email || "").toString().trim().toLowerCase();
    if (!em) { setError("Enter your work email"); return; }

    try {
      const who = await api.whoami(em); // ← THIS is the correct call
      if (!who.allowed) {
        setError(`Only @${who.allowedDomain} accounts are allowed.`);
        return;
      }
      const user = { email: em };
      localStorage.setItem("f15:user", JSON.stringify(user));
      setEmail(em);
      onEmail?.(em);
    } catch (err) {
      setError(String(err?.message || err));
    }
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
    <div className="min-h-dvh bg-white text-black">
      {/* top bar */}
      <div className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <div className="font-bold">Frame-15 Internal</div>
          <div className="ml-2 flex items-center gap-2">
            <NavButton id="work" label="Work" />
            <NavButton id="projects" label="Projects" />
            <NavButton id="insights" label="Insights" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {email ? (
              <>
                <span className="text-sm text-neutral-600">{email}</span>
                <button className="border px-3 py-2 rounded-xl hover:bg-neutral-50" onClick={signOut}>Sign out</button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {email ? children : (
          <div className="max-w-md mx-auto border rounded-2xl p-5">
            <div className="text-xl font-semibold mb-2">Sign in</div>
            <p className="text-sm text-neutral-600 mb-4">
              Use your work email. Only the allowed domain can access.
            </p>
            <form onSubmit={signIn} className="grid gap-3">
              <input
                className="f15-input"
                type="email"
                name="email"
                placeholder="you@frame15.com"
                defaultValue={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button className="f15-btn f15-btn--primary" type="submit" disabled={checking}>
                {checking ? "Checking…" : "Continue"}
              </button>
            </form>
            {error && <div className="text-red-600 text-sm mt-3">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
