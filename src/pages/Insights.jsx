import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Insights({ email }) {
  const [data, setData] = useState({ totalHours: 0, hoursByProject: [], hoursByUser: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const r = await api.report({});
        setData(r);
      } catch (e) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [email]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
        <div className="text-xl font-semibold">Last 7 days</div>
        <div className="text-gray-400 text-sm">Total time: <b>{data.totalHours.toFixed(2)} h</b></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
          <div className="text-lg font-semibold mb-2">By project</div>
          {loading ? (
            <div className="h-24 rounded-xl animate-pulse" style={{background:"var(--surface-2)", border:"1px solid var(--line)"}} />
          ) : data.hoursByProject.length === 0 ? (
            <div className="text-gray-400 text-sm">No data.</div>
          ) : (
            <div className="space-y-2">
              {data.hoursByProject.map((p)=>(
                <Row key={p.projectNumber} label={p.projectNumber} value={p.hours} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{border:"1px solid var(--line)", background:"var(--surface)"}}>
          <div className="text-lg font-semibold mb-2">By person</div>
          {loading ? (
            <div className="h-24 rounded-xl animate-pulse" style={{background:"var(--surface-2)", border:"1px solid var(--line)"}} />
          ) : data.hoursByUser.length === 0 ? (
            <div className="text-gray-400 text-sm">No data.</div>
          ) : (
            <div className="space-y-2">
              {data.hoursByUser.map((u)=>(
                <Row key={u.user} label={u.user} value={u.hours} />
              ))}
            </div>
          )}
        </div>
      </div>

      {err && <div className="text-red-500 text-sm">{err}</div>}
    </div>
  );
}

function Row({ label, value }) {
  const pct = Math.min(100, Math.round((value / 40) * 100)); // naive scale vs 40h
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <div className="text-gray-300">{label}</div>
        <div className="font-semibold">{value.toFixed(2)} h</div>
      </div>
      <div className="h-2 rounded-full mt-1 overflow-hidden" style={{background:"var(--surface-2)", border:"1px solid var(--line)"}}>
        <div className="h-full" style={{width:`${pct}%`, background:"linear-gradient(90deg, #3b82f6, #ef4444)"}} />
      </div>
    </div>
  );
}
