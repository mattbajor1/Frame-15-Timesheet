// src/pages/Work.jsx
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

  useEffect(() => {
    if (email) refresh();
  }, [email, refresh]);

  async function start() {
    setBusy(true);
    setErr("");
    try {
      await api.startShift();
      await refresh();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setErr("");
    try {
      await api.stopShift();
      await refresh();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="f15-card">
        <div className="f15-h2 mb-2">Your shift</div>
        {active ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-neutral-400">Clocked in</div>
              <div className="text-lg">{new Date(active.inISO).toLocaleTimeString()}</div>
            </div>
            <button className="f15-btn f15-btn--danger" onClick={stop} disabled={busy}>
              Clock out
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-400">Not on the clock</div>
            <button className="f15-btn f15-btn--blue" onClick={start} disabled={busy}>
              Clock in
            </button>
          </div>
        )}
        {err && <div className="text-red-500 text-sm mt-3">{err}</div>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="f15-card">
          <div className="text-sm text-neutral-400">Today</div>
          <div className="text-3xl font-bold">{today.toFixed(2)} h</div>
        </div>
        <div className="f15-card">
          <div className="text-sm text-neutral-400">This week</div>
          <div className="text-3xl font-bold">{week.toFixed(2)} h</div>
        </div>
      </div>

      <div className="f15-card">
        <div className="f15-h2 mb-2">How to track tasks</div>
        <p className="text-sm text-neutral-400">
          Clock in/out tracks your workday. Time on individual tasks is computed from the Time Log and task sessions. We’ll add direct “log to task” soon.
        </p>
      </div>
    </div>
  );
}
