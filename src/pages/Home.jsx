import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import logo from "../assets/f15_internal.png";
import BreathingBackdrop from "../components/BreathingBackdrop.jsx";

const greetings = [
  "Let’s build something great today.",
  "Small steps, big wins.",
  "Sharp focus. Clean execution.",
  "Create. Iterate. Ship.",
  "Stay curious. Stay kind.",
];

export default function Home({ setPage }) {
  const [greet, setGreet] = useState("");
  const [lists, setLists] = useState({ projects: [], tasks: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setGreet(greetings[Math.floor(Math.random() * greetings.length)]);
    const cached = api.listsCached();
    if (cached) { setLists(cached); setLoading(false); }
    (async () => {
      try { const l = await api.lists(); setLists(l); }
      catch (e) { setErr(String(e?.message || e)); }
      finally { setLoading(false); }
    })();
  }, []);

  const quickProjects = useMemo(() => (lists.projects || []).slice(0, 6), [lists.projects]);
  const upcoming = useMemo(() => {
    const arr = (lists.tasks || []).filter(t=>t.dueISO).slice().sort((a,b)=> a.dueISO > b.dueISO ? 1 : -1);
    return arr.slice(0, 6);
  }, [lists.tasks]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl p-6"
           style={{ border: "1px solid var(--line)", background: "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))" }}>
        <BreathingBackdrop />

        {/* PROMINENT LOGO ROW */}
        <div className="relative z-10 flex items-center gap-3">
          <img src={logo} alt="Frame 15 Internal" className="h-10 w-auto drop-shadow" />
          <div className="text-sm text-blue-300/90">Frame-15 Internal</div>
        </div>

        <div className="relative z-10 mt-2">
          <h1 className="text-3xl font-bold">Everything in one frame.</h1>
          <p className="text-gray-300 mt-1">{greet}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={()=>setPage("projects")} className="px-4 py-2 rounded-xl font-semibold bg-white text-black">Manage Projects</button>
            <button onClick={()=>setPage("work")} className="px-4 py-2 rounded-xl font-semibold" style={{ border: "1px solid var(--line)" }}>Open Work</button>
            <button onClick={()=>setPage("insights")} className="px-4 py-2 rounded-xl font-semibold" style={{ border: "1px solid var(--line)" }}>View Insights</button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
          <div className="text-sm text-gray-400">Projects</div>
          <div className="text-3xl font-bold mt-1">{(lists.projects || []).length}</div>
        </div>
        <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
          <div className="text-sm text-gray-400">People</div>
          <div className="text-3xl font-bold mt-1">{(lists.users || []).filter(u=>u.active!==false).length}</div>
        </div>
        <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
          <div className="text-sm text-gray-400">Upcoming tasks</div>
          <div className="text-3xl font-bold mt-1">{upcoming.length}</div>
        </div>
      </div>

      {/* tiles */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-semibold">Active projects</div>
          <button onClick={()=>setPage("projects")} className="px-3 py-1.5 rounded-lg hover:bg-white/10">All Projects →</button>
        </div>
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }} />
            ))}
          </div>
        ) : quickProjects.length === 0 ? (
          <div className="text-gray-400 text-sm">No projects yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickProjects.map((p) => (
              <div key={p.number} className="rounded-xl p-4 hover:-translate-y-0.5 transition"
                   style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.number}</div>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ border: "1px solid var(--line)" }}>{p.status}</span>
                </div>
                <div className="text-sm mt-1">{p.name}</div>
                <div className="text-xs text-gray-400">{p.client || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {err && <div className="text-red-500 text-sm">{err}</div>}
    </div>
  );
}
