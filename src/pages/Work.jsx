import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../components/ToastContext.js";

export default function Work({ email }) {
  const t = useToast();
  const [active, setActive] = useState(null); // { inISO }
  const [today, setToday] = useState(0);
  const [week, setWeek] = useState(0);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef(null);

  // optimistic cache so it doesn't "stop" when leaving page
  const cacheKey = `f15:shift:${email}`;

  const pull = useCallback(async () => {
    if (!email) return;
    try {
      const s = await api.shiftSummary(email);
      setActive(s.active || null);
      setToday(Number(s.todayHours || 0));
      setWeek(Number(s.weekHours || 0));
      if (s.active) localStorage.setItem(cacheKey, JSON.stringify(s.active));
      else localStorage.removeItem(cacheKey);
    } catch {
      // fall back to local optimistic state if API is slow
      const cached = localStorage.getItem(cacheKey);
      if (cached) setActive(JSON.parse(cached));
    }
  }, [email, cacheKey]);

  useEffect(() => {
    // paint from optimistic cache immediately
    const cached = localStorage.getItem(cacheKey);
    if (cached) setActive(JSON.parse(cached));
    pull();
    // background poll (keeps badge in sync)
    pollRef.current = setInterval(pull, 15000);
    return () => clearInterval(pollRef.current);
  }, [pull, cacheKey]);

  async function start() {
    if (busy || active) return;
    setBusy(true);
    // optimistic
    const fake = { inISO: new Date().toISOString() };
    setActive(fake);
    localStorage.setItem(cacheKey, JSON.stringify(fake));
    try {
      await api.startShift();
      t.show("Clocked in", "success");
      await pull();
    } catch (e) {
      // rollback
      setActive(null);
      localStorage.removeItem(cacheKey);
      t.show(`Clock in failed: ${e?.message || e}`, "error", 4000);
    } finally {
      setBusy(false);
    }
  }
  async function stop() {
    if (busy || !active) return;
    setBusy(true);
    // optimistic: clear now
    setActive(null);
    localStorage.removeItem(cacheKey);
    try {
      await api.stopShift();
      t.show("Clocked out", "success");
      await pull();
    } catch (e) {
      t.show(`Clock out failed: ${e?.message || e}`, "error", 4000);
      // re-pull to show real server state
      await pull();
    } finally {
      setBusy(false);
    }
  }

  const fmt = (h) => (h < 0.25 ? `${Math.round(h * 60)} min` : `${h.toFixed(2)} h`);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="text-xl font-semibold mb-2">Your shift</div>
        {active ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">Clocked in since</div>
            <div className="text-lg">{new Date(active.inISO).toLocaleTimeString()}</div>
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={stop} disabled={busy}>
              {busy ? "Working…" : "Clock out"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">Not on the clock</div>
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={start} disabled={busy}>
              {busy ? "Working…" : "Clock in"}
            </button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
          <div className="text-sm text-gray-400">Today</div>
          <div className="text-3xl font-bold mt-1">{fmt(today)}</div>
        </div>
        <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
          <div className="text-sm text-gray-400">This week</div>
          <div className="text-3xl font-bold mt-1">{fmt(week)}</div>
        </div>
      </div>
    </div>
  );
}
