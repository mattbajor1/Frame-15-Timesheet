import { useEffect, useState } from "react";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import Work from "./pages/Work";
import Insights from "./pages/Insights";

export default function App() {
  const [page, setPage] = useState("home");
  const [email, setEmail] = useState("");

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("f15:user") || "{}");
      if (u?.email) setEmail(u.email);
    } catch { /* empty */ }
  }, []);

  function login(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const em = String(form.get("email") || "").trim();
    if (!/@frame15\.com$/i.test(em)) { alert("Use your @frame15.com email"); return; }
    localStorage.setItem("f15:user", JSON.stringify({ email: em }));
    setEmail(em);
  }
  function logout() {
    localStorage.removeItem("f15:user");
    setEmail("");
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border" style={{borderColor:"var(--line)", background:"var(--surface)"}}>
          <div className="p-6">
            <div className="text-sm text-blue-400">Frame-15 Internal</div>
            <h1 className="text-2xl font-bold mt-1">Sign in</h1>
            <p className="text-sm text-gray-400 mt-1">Only <b>@frame15.com</b> allowed.</p>
            <form className="mt-4 space-y-3" onSubmit={login}>
              <input name="email" placeholder="you@frame15.com"
                     className="w-full rounded-xl px-3 py-2 border bg-transparent"
                     style={{borderColor:"var(--line)"}} />
              <button className="w-full rounded-xl px-4 py-2 font-semibold"
                      style={{background:"#fff", color:"#000"}}>Continue</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* top nav */}
      <div className="sticky top-0 z-10 backdrop-blur-md"
           style={{background:"rgba(11,11,15,0.6)", borderBottom:`1px solid var(--line)`}}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-sm text-blue-400 font-medium">Frame-15 Internal</div>
          <div className="flex-1" />
          <nav className="flex gap-2 text-sm">
            <button onClick={()=>setPage("home")}    className={`px-3 py-1.5 rounded-lg ${page==="home"?"bg-white text-black":"hover:bg-white/10"}`}>Home</button>
            <button onClick={()=>setPage("projects")}className={`px-3 py-1.5 rounded-lg ${page==="projects"?"bg-white text-black":"hover:bg-white/10"}`}>Projects</button>
            <button onClick={()=>setPage("work")}    className={`px-3 py-1.5 rounded-lg ${page==="work"?"bg-white text-black":"hover:bg-white/10"}`}>Work</button>
            <button onClick={()=>setPage("insights")}className={`px-3 py-1.5 rounded-lg ${page==="insights"?"bg-white text-black":"hover:bg-white/10"}`}>Insights</button>
          </nav>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {email}
            <button onClick={logout} className="px-2 py-1 rounded-md hover:bg-white/10">Log out</button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {page==="home"     && <Home email={email} setPage={setPage} />}
        {page==="projects" && <Projects email={email} />}
        {page==="work"     && <Work email={email} />}
        {page==="insights" && <Insights email={email} />}
      </main>
    </div>
  );
}
