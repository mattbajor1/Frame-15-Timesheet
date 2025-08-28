import { useEffect, useMemo, useState } from "react";

const GREETINGS = [
  "Let’s make something beautiful today.",
  "Small cuts, big story.",
  "Rolling… focus on what matters.",
  "Craft > speed. But both is best.",
  "Frame by frame, hour by hour."
];

export default function Shell({ page, setPage, children }) {
  const [name, setName] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("f15:user");
    if (stored) {
      const u = JSON.parse(stored);
      setName(u.name || u.email || "");
    } else {
      setShowLogin(true);
    }
    const last = localStorage.getItem("f15:greet");
    let next = GREETINGS[Math.floor(Math.random()*GREETINGS.length)];
    if (last && last === next) next = GREETINGS[(GREETINGS.indexOf(next)+1)%GREETINGS.length];
    setGreeting(next);
    localStorage.setItem("f15:greet", next);
  }, []);

  function saveUser(e){
    e.preventDefault();
    const email = e.target.email.value.trim();
    const display = e.target.display.value.trim();
    if(!email) return;
    localStorage.setItem("f15:user", JSON.stringify({ email, name: display || email }));
    setName(display || email);
    setShowLogin(false);
    // bubble up email change for consumers
    window.dispatchEvent(new CustomEvent("f15:userchange",{ detail:{ email, name: display || email }}));
  }

  const tabs = useMemo(()=>[
    { id:'dash',   label:'Dashboard' },
    { id:'projects', label:'Projects' },
    { id:'tasks', label:'Tasks' },
    { id:'analytics', label:'Analytics' },
  ],[]);

  return (
    <div>
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-bold text-lg">Frame 15 Internal</div>
            <nav className="hidden sm:flex gap-1">
              {tabs.map(t=>(
                <button key={t.id}
                  onClick={()=>setPage(t.id)}
                  className={`px-3 py-1.5 rounded-xl border ${page===t.id?'bg-neutral-900 text-white border-neutral-900':'border-neutral-300 hover:bg-neutral-50'}`}>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="text-sm text-neutral-600">{greeting} {name && <span className="font-medium">— {name}</span>}</div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-6">{children}</main>

      {/* Login modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <form onSubmit={saveUser} className="bg-white rounded-2xl shadow-xl border p-6 w-full max-w-md space-y-3">
            <h2 className="text-xl font-semibold">Welcome to Frame 15 Internal</h2>
            <p className="text-sm text-neutral-600">Tell us who you are so we can personalize your experience.</p>
            <input name="display" placeholder="Display name (optional)" className="border rounded-xl px-3 py-2 w-full"/>
            <input name="email" type="email" required placeholder="you@frame15.com" className="border rounded-xl px-3 py-2 w-full"/>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={()=>setShowLogin(false)} className="px-3 py-2 rounded-xl border">Skip</button>
              <button className="px-3 py-2 rounded-xl border border-neutral-900 bg-neutral-900 text-white">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
