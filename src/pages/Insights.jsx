// src/pages/Insights.jsx
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Insights({ email }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(()=>{
    async function run(){
      setErr("");
      try {
        const to = new Date();
        const from = new Date(); from.setDate(to.getDate() - 7);
        const r = await api.report({ fromISO: from.toISOString(), toISO: to.toISOString(), email });
        setData(r);
      } catch (e) { setErr(String(e?.message || e)); }
    }
    if (email) run();
  }, [email]);

  if (err) return <div className="text-red-500 text-sm">{err}</div>;
  if (!data) return <div className="text-neutral-400">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="f15-card">
        <div className="f15-h2">This week</div>
        <div className="text-3xl font-bold mt-2">{data.totalHours.toFixed(2)} h</div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="f15-card">
          <div className="f15-h2 mb-2">By project</div>
          {data.hoursByProject.length===0 ? <div className="text-neutral-400 text-sm">No time yet.</div> :
            <ul className="text-sm space-y-1">{data.hoursByProject.map(p=>(
              <li key={p.projectNumber} className="flex items-center justify-between">
                <span>{p.projectNumber}</span><b>{p.hours.toFixed(2)} h</b>
              </li>
            ))}</ul>
          }
        </div>
        <div className="f15-card">
          <div className="f15-h2 mb-2">By person</div>
          {data.hoursByUser.length===0 ? <div className="text-neutral-400 text-sm">No time yet.</div> :
            <ul className="text-sm space-y-1">{data.hoursByUser.map(u=>(
              <li key={u.user} className="flex items-center justify-between">
                <span>{u.user}</span><b>{u.hours.toFixed(2)} h</b>
              </li>
            ))}</ul>
          }
        </div>
      </div>
    </div>
  );
}
