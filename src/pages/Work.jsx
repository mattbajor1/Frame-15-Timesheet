// src/pages/Work.jsx
import { useEffect, useMemo, useState } from "react";
import { useShift } from "../contexts/ShiftContext.js";
import { api } from "../lib/api";
import { useToast } from "../components/ToastContext.js";

export default function Work() {
  const shift = useShift();

  // Safe toast (works even if provider isn't mounted)
  const toastCtx = useToast?.();
  const showToast = useMemo(() => (toastCtx?.show ?? (() => {})), [toastCtx]);

  // API diagnostics
  const API_URL = import.meta.env.VITE_API_URL;
  const API_KEY = import.meta.env.VITE_API_KEY;
  const [diag, setDiag] = useState({ ok: true, msg: "" });

  // Lists + UI state
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ projectNumber: "", taskName: "", label: "", billable: false });
  const [timers, setTimers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingTimers, setLoadingTimers] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // "now" tick (updates active timer elapsed)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Boot diagnostics (don’t block UI)
  useEffect(() => {
    (async () => {
      if (!API_URL) {
        setDiag({ ok: false, msg: "VITE_API_URL is missing." });
        return;
      }
      if (!API_KEY) {
        setDiag({ ok: false, msg: "VITE_API_KEY is missing." });
        return;
      }
      try {
        // lightweight ping to verify URL/key
        const u = new URL(API_URL);
        const q = new URLSearchParams({ action: "ping", key: API_KEY });
        const r = await fetch(`${u}?${q}`);
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.ok === false) {
          setDiag({ ok: false, msg: `Ping failed: ${j?.error || r.statusText}` });
        } else {
          setDiag({ ok: true, msg: "" });
        }
      } catch (e) {
        setDiag({ ok: false, msg: `Ping error: ${e?.message || e}` });
      }
    })();
  }, [API_URL, API_KEY]);

  // Load projects (cache first), timers, logs
  useEffect(() => {
    const cached = api.listsCached?.();
    if (cached?.projects) setProjects(cached.projects);
    (async () => {
      try {
        const l = await api.lists();
        setProjects(l.projects || []);
      } catch {
        // not fatal
      }
    })();
    refreshTimers();
    refreshLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshTimers() {
    setLoadingTimers(true);
    try {
      const t = await api.timers();
      setTimers(t || []);
    } catch (e) {
      showToast(`Timers failed: ${e?.message || e}`, "error");
    } finally {
      setLoadingTimers(false);
    }
  }
  async function refreshLogs() {
    setLoadingLogs(true);
    try {
      const l = await api.timeLog(20);
      setLogs(l || []);
    } catch (e) {
      showToast(`History failed: ${e?.message || e}`, "error");
    } finally {
      setLoadingLogs(false);
    }
  }

  async function onStartTimer() {
    if (!form.taskName && !form.label) {
      showToast("Enter a task name (or a label).", "error");
      return;
    }
    try {
      await api.startTimer(form);
      showToast("Timer started", "success");
      setForm((f) => ({ ...f, taskName: "", label: "" })); // keep project/billable sticky
      await refreshTimers();
    } catch (e) {
      showToast(`Start failed: ${e?.message || e}`, "error", 4000);
    }
  }
  async function onStopTimer(id) {
    try {
      await api.stopTimer(id);
      showToast("Timer saved", "success");
      await Promise.all([refreshTimers(), refreshLogs()]);
    } catch (e) {
      showToast(`Stop failed: ${e?.message || e}`, "error", 4000);
    }
  }

  // helpers
  const fmtHuman = (mins) => (mins < 15 ? `${mins} min` : `${(mins / 60).toFixed(2)} h`);
  const elapsedMins = (iso) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));

  return (
    <div className="space-y-6">
      {/* Diagnostics card (only shows when something is off) */}
      {!diag.ok && (
        <div className="rounded-2xl p-4" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
          <div className="text-red-400 font-semibold mb-1">API diagnostics</div>
          <div className="text-sm text-gray-300">{diag.msg}</div>
          <div className="text-xs text-gray-400 mt-2 space-y-1">
            <div>VITE_API_URL: <b>{API_URL ? "set" : "missing"}</b></div>
            <div>VITE_API_KEY: <b>{API_KEY ? "set" : "missing"}</b></div>
          </div>
        </div>
      )}

      {/* Shift card */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="text-xl font-semibold mb-2">Your shift</div>
        {shift?.active ? (
          <div className="flex items-center gap-3 justify-between">
            <div className="text-sm text-gray-400">Clocked in since</div>
            <div className="text-lg">{new Date(shift.active.inISO).toLocaleTimeString()}</div>
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={shift.stop}>
              Clock out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 justify-between">
            <div className="text-sm text-gray-400">Not on the clock</div>
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={shift.start}>
              Clock in
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-xl p-4" style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
            <div className="text-xs text-gray-400">Today</div>
            <div className="text-2xl font-bold">
              {shift?.today < 0.25 ? `${Math.round((shift?.today || 0) * 60)} min` : `${(shift?.today || 0).toFixed(2)} h`}
            </div>
          </div>
          <div className="rounded-xl p-4" style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
            <div className="text-xs text-gray-400">This week</div>
            <div className="text-2xl font-bold">
              {shift?.week < 0.25 ? `${Math.round((shift?.week || 0) * 60)} min` : `${(shift?.week || 0).toFixed(2)} h`}
            </div>
          </div>
        </div>
      </div>

      {/* Start a task timer */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="text-xl font-semibold mb-3">Task timers</div>

        <div className="grid md:grid-cols-4 gap-3">
          <select
            className="rounded-xl px-3 py-2 border bg-transparent"
            style={{ borderColor: "var(--line)" }}
            value={form.projectNumber}
            onChange={(e) => setForm((f) => ({ ...f, projectNumber: e.target.value }))}
          >
            <option value="">Select project (optional)</option>
            {projects.map((p) => (
              <option key={p.number} value={p.number}>
                {p.number} — {p.name}
              </option>
            ))}
          </select>

        <input
          className="rounded-xl px-3 py-2 border bg-transparent md:col-span-2"
          style={{ borderColor: "var(--line)" }}
          placeholder="Task name"
          value={form.taskName}
          onChange={(e) => setForm((f) => ({ ...f, taskName: e.target.value }))}
        />

        <input
          className="rounded-xl px-3 py-2 border bg-transparent"
          style={{ borderColor: "var(--line)" }}
          placeholder="Label (optional)"
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
        />
        </div>

        <div className="flex items-center gap-3 mt-3">
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.billable}
              onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))}
            />
            Billable
          </label>
          <div className="flex-1" />
          <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={onStartTimer}>
            Start timer
          </button>
        </div>
      </div>

      {/* Active timers */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">Active</div>
          <button className="px-3 py-1.5 rounded-lg hover:bg-white/10" onClick={refreshTimers}>Refresh</button>
        </div>

        {loadingTimers ? (
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }} />
            ))}
          </div>
        ) : timers.length === 0 ? (
          <div className="text-gray-400 text-sm mt-2">No active timers.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            {timers.map((tm) => {
              const mins = elapsedMins(tm.inISO);
              return (
                <div key={tm.id} className="rounded-xl p-4 flex items-center justify-between"
                     style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{tm.label || tm.taskName || "(Timer)"}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {tm.projectNumber ? `${tm.projectNumber} · ` : ""}
                      {new Date(tm.inISO).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono opacity-90">{fmtHuman(mins)}</div>
                    <button className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold" onClick={() => onStopTimer(tm.id)}>
                      Stop
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent history */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold">Recent entries</div>
          <button className="px-3 py-1.5 rounded-lg hover:bg-white/10" onClick={refreshLogs}>Refresh</button>
        </div>

        {loadingLogs ? (
          <div className="space-y-2 mt-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-gray-400 text-sm mt-2">No entries yet.</div>
        ) : (
          <div className="space-y-2 mt-3">
            {logs.map((l) => (
              <div key={l.id} className="rounded-xl p-3 flex items-center justify-between"
                   style={{ border: "1px solid var(--line)", background: "var(--surface-2)" }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {l.projectNumber ? `${l.projectNumber} — ` : ""}{l.task || "(Entry)"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(l.inISO).toLocaleString()} → {new Date(l.outISO).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-sm font-semibold">{fmtHuman(l.minutes)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
