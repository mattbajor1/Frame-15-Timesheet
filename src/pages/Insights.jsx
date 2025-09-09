// src/pages/Insights.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../components/ToastContext.js";

export default function Insights() {
  const t = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const l = await api.timeLog(200); // a bigger sample
        setLogs(l || []);
      } catch (e) {
        const msg = String(e?.message || e);
        setErr(msg); t.show(msg, "error");
      } finally { setLoading(false); }
    })();
  }, [t]);

  const byProject = useMemo(() => {
    const m = new Map();
    logs.forEach(l => {
      const k = l.projectNumber || "(No project)";
      m.set(k, (m.get(k)||0) + (Number(l.minutes)||0));
    });
    return Array.from(m.entries()).map(([k, mins]) => ({ key:k, minutes:mins }))
      .sort((a,b)=>b.minutes-a.minutes).slice(0,12);
  }, [logs]);

  const byDay = useMemo(() => {
    // last 7 unique days
    const m = new Map();
    logs.forEach(l => { const d = l.day || (l.inISO||"").slice(0,10); if (!d) return; m.set(d,(m.get(d)||0)+Number(l.minutes||0)); });
    const keys = Array.from(m.keys()).sort(); // ascending
    const last7 = keys.slice(-7);
    return last7.map(d => ({ day:d, minutes:m.get(d) || 0 }));
  }, [logs]);

  const fmtH = (m) => (m < 15 ? `${m} min` : `${(m/60).toFixed(2)} h`);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5" style={{ border:"1px solid var(--line)", background:"var(--surface)" }}>
        <div className="text-xl font-semibold">Insights</div>
        <p className="text-gray-400 text-sm mt-1">Your saved task timers, summarized.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{ border:"1px solid var(--line)", background:"var(--surface)" }}>
          <div className="text-lg font-semibold mb-2">By project</div>
          {loading ? (
            <div className="space-y-2">{Array.from({length:6}).map((_,i)=><div key={i} className="h-10 rounded-xl animate-pulse" style={{background:"var(--surface-2)", border:"1px solid var(--line)"}} />)}</div>
          ) : byProject.length === 0 ? (
            <div className="text-gray-400 text-sm">No data yet.</div>
          ) : (
            <div className="space-y-2">
              {byProject.map(p => (
                <div key={p.key} className="flex items-center justify-between rounded-xl p-3"
                     style={{ border:"1px solid var(--line)", background:"var(--surface-2)" }}>
                  <div className="text-sm">{p.key}</div>
                  <div className="text-sm font-semibold">{fmtH(p.minutes)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ border:"1px solid var(--line)", background:"var(--surface)" }}>
          <div className="text-lg font-semibold mb-2">Last 7 days</div>
          {loading ? (
            <div className="space-y-2">{Array.from({length:7}).map((_,i)=><div key={i} className="h-10 rounded-xl animate-pulse" style={{background:"var(--surface-2)", border:"1px solid var(--line)"}} />)}</div>
          ) : byDay.length === 0 ? (
            <div className="text-gray-400 text-sm">No data yet.</div>
          ) : (
            <div className="space-y-2">
              {byDay.map(d => (
                <div key={d.day} className="flex items-center justify-between rounded-xl p-3"
                     style={{ border:"1px solid var(--line)", background:"var(--surface-2)" }}>
                  <div className="text-sm">{new Date(d.day).toLocaleDateString()}</div>
                  <div className="text-sm font-semibold">{fmtH(d.minutes)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ border:"1px solid var(--line)", background:"var(--surface)" }}>
        <div className="text-lg font-semibold mb-2">Recent entries</div>
        {loading ? (
          <div className="space-y-2">{Array.from({length:8}).map((_,i)=><div key={i} className="h-12 rounded-xl animate-pulse" style={{background:"var(--surface-2)", border:"1px solid var(--line)"}} />)}</div>
        ) : logs.length === 0 ? (
          <div className="text-gray-400 text-sm">No entries yet.</div>
        ) : (
          <div className="space-y-2">
            {logs.slice(0,12).map(l => (
              <div key={l.id} className="rounded-xl p-3 flex items-center justify-between"
                   style={{ border:"1px solid var(--line)", background:"var(--surface-2)" }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.projectNumber ? `${l.projectNumber} — ` : ""}{l.task || "(Entry)"}</div>
                  <div className="text-xs text-gray-400">{new Date(l.inISO).toLocaleString()} → {new Date(l.outISO).toLocaleTimeString()}</div>
                </div>
                <div className="text-sm font-semibold">{fmtH(l.minutes)}</div>
              </div>
            ))}
          </div>
        )}
        {err && <div className="text-red-500 text-sm mt-2 break-words">{err}</div>}
      </div>
    </div>
  );
}
