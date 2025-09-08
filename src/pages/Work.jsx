import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Work({ email }) {
  const [active, setActive] = useState(null);
  const [today, setToday] = useState(0);
  const [week, setWeek] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const refresh = useCallback(async () => {
    if (!email) return;
    setErr("");
    try {
      const s = await api.shiftSummary(email);
      setActive(s.active);
      setToday(s.todayHours);
      setWeek(s.weekHours);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }, [email]);

  useEffect(() => { if (email) refresh(); }, [email, refresh]);

  async function start() {
    if (active) return;
    setBusy(true); setErr("");
    try { await api.startShift(); await refresh(); }
    catch (e){ setErr(String(e?.message || e)); }
    finally { setBusy(false); }
  }
  async function stop() {
    if (!active) return;
    setBusy(true); setErr("");
    try { await api.stopShift(); await refresh(); }
    catch (e){ setErr(String(e?.message || e)); }
    finally { setBusy(false); }
  }

  const fmt = (h) => (h < 0.25 ? `${Math.round(h*60)} min` : `${h.toFixed(2)} h`);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
        <div className="text-xl font-semibold mb-2">Your shift</div>
        {active ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">Clocked in since</div>
            <div className="text-lg">{new Date(active.inISO).toLocaleTimeString()}</div>
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={stop} disabled={busy}>Clock out</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">Not on the clock</div>
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={start} disabled={busy}>Clock in</button>
          </div>
        )}
        {err && <div className="text-red-500 text-sm mt-3">{err}</div>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
          <div className="text-sm text-gray-400">Today</div>
          <div className="text-3xl font-bold mt-1">{fmt(today)}</div>
        </div>
        <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
          <div className="text-sm text-gray-400">This week</div>
          <div className="text-3xl font-bold mt-1">{fmt(week)}</div>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
        <div className="text-xl font-semibold mb-2">How it works</div>
        <p className="text-sm text-gray-400">
          Clock in/out tracks your workday. Project/task time comes from <b>Time Log</b> entries.
          We’ll layer task-level timers next.
        </p>
      </div>
    </div>
  );
}
