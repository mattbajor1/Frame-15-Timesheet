import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function Insights(){
  const [data, setData] = useState(null);
  useEffect(()=>{ (async()=>{ const r = await api.report(); setData(r); })(); }, []);
  if(!data) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="f15-h1">Insights</div>

      <div className="f15-card">
        <div className="f15-h2 mb-1">This week</div>
        <div className="text-sm text-neutral-600">Starting {new Date(data.fromISO).toLocaleDateString()} — Total {data.totalHours}h</div>
        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <div className="h-80">
            <div className="font-semibold mb-2">By Project</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hoursByProject}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="projectNumber" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="h-80">
            <div className="font-semibold mb-2">By User</div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hoursByUser}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="user" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
