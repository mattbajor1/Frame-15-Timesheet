// src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import logo from "../assets/f15_internal.png"; // 👈 local import, no env var

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
  const [, setLoading] = useState(true);
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

  const upcoming = useMemo(() => {
    const arr = (lists.tasks || []).filter(t=>t.dueISO).slice().sort((a,b)=> a.dueISO > b.dueISO ? 1 : -1);
    return arr.slice(0, 6);
  }, [lists.tasks]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl p-6"
           style={{ border: "1px solid var(--line)", background: "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02))" }}>
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-20"
             style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 60%)" }} />
        <div className="absolute -bottom-28 -right-28 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-20"
             style={{ background: "radial-gradient(circle, #ef4444 0%, transparent 60%)" }} />

        {/* watermark uses local import */}
        <img src={logo} alt="" aria-hidden className="pointer-events-none select-none absolute -right-10 -top-10 hidden md:block"
             style={{ height: "180%", opacity: .06, filter: "blur(1px) drop-shadow(0 24px 40px rgba(0,0,0,.35))", transform: "rotate(-2.5deg)" }}/>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
                  style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
              <img src={logo} alt="" className="h-4 w-4 object-contain" />
              Frame-15 Internal
            </span>
          </div>
          <h1 className="text-3xl font-bold mt-3">Everything in one frame.</h1>
          <p className="text-gray-400 mt-1">{greet}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={()=>setPage("projects")} className="px-4 py-2 rounded-xl font-semibold bg-white text-black">Manage Projects</button>
            <button onClick={()=>setPage("work")} className="px-4 py-2 rounded-xl font-semibold" style={{ border: "1px solid var(--line)" }}>Open Work</button>
            <button onClick={()=>setPage("insights")} className="px-4 py-2 rounded-xl font-semibold" style={{ border: "1px solid var(--line)" }}>View Insights</button>
          </div>
        </div>

        <div className="relative z-10 mt-6">
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
            <div className="flex items-center gap-6 py-2 px-3 opacity-60">
              {Array.from({ length: 12 }).map((_, i) => (
                <img key={i} src={logo} alt="" className="h-5 w-auto object-contain" style={{ filter: "grayscale(1) brightness(1.3)" }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* …rest of the component unchanged … */}
      {/* KPIs, tiles, errors, etc. */}
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

      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        {/* …active projects grid… */}
      </div>

      {err && <div className="text-red-500 text-sm">{err}</div>}
    </div>
  );
}
