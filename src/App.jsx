import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import Work from "./pages/Work";
import Insights from "./pages/Insights";
import ShiftProvider from "./providers/ShiftProvider.jsx";
import { useShift } from "./contexts/ShiftContext.js";
import logo from "./assets/frame15-internal-logo.webp";

function Nav({ page, setPage, email, onLogout }) {
  const { active } = useShift();
  return (
    <div className="sticky top-0 z-10 backdrop-blur-md" style={{background:"rgba(11,11,15,0.6)", borderBottom:"1px solid var(--line)"}}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Frame 15 Internal" className="h-7 md:h-8" />
        </div>
        <div className="flex-1" />
        <nav className="flex gap-2 text-sm">
          {["home","projects","work","insights"].map(p => (
            <button key={p} onClick={()=>setPage(p)} className={`px-3 py-1.5 rounded-lg ${page===p?"bg-white text-black":"hover:bg-white/10"}`}>{p[0].toUpperCase()+p.slice(1)}</button>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-3 text-sm text-gray-300">
          {active ? <span className="inline-flex items-center gap-1 text-green-400">● <span className="hidden sm:inline">Clocked in</span></span> : <span className="text-gray-400 hidden sm:inline">Not clocked in</span>}
          <span className="text-gray-400">{email}</span>
          <button onClick={onLogout} className="px-2 py-1 rounded-md hover:bg-white/10">Log out</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("home");
  const [email, setEmail] = useState("");

  useEffect(() => {
    try { const u = JSON.parse(localStorage.getItem("f15:user") || "{}"); if (u?.email) setEmail(u.email); } catch { /* empty */ }
  }, []);
  function login(e) {
    e.preventDefault();
    const em = new FormData(e.currentTarget).get("email")?.toString().trim() || "";
    if (!/@frame15\.com$/i.test(em)) { alert("Use your @frame15.com email"); return; }
    localStorage.setItem("f15:user", JSON.stringify({ email: em }));
    setEmail(em);
  }
  function logout(){ localStorage.removeItem("f15:user"); setEmail(""); }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border" style={{borderColor:"var(--line)", background:"var(--surface)"}}>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Frame 15 Internal" className="h-8" />
              <div className="text-sm text-blue-400">Frame-15 Internal</div>
            </div>
            <h1 className="text-2xl font-bold mt-3">Sign in</h1>
            <p className="text-sm text-gray-400 mt-1">Only <b>@frame15.com</b> allowed.</p>
            <form className="mt-4 space-y-3" onSubmit={login}>
              <input name="email" placeholder="you@frame15.com" className="w-full rounded-xl px-3 py-2 border bg-transparent" style={{borderColor:"var(--line)"}} />
              <button className="w-full rounded-xl px-4 py-2 font-semibold bg-white text-black">Continue</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ShiftProvider email={email}>
      <div className="min-h-screen relative">
        <Nav page={page} setPage={setPage} email={email} onLogout={logout} />
        <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {page==="home"     && <Home email={email} setPage={setPage} />}
          {page==="projects" && <Projects email={email} />}
          {page==="work"     && <Work email={email} />}
          {page==="insights" && <Insights email={email} />}
        </main>
      </div>
    </ShiftProvider>
  );
}
