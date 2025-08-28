import { useEffect, useState } from "react";
import Card from "../components/Card";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export default function Analytics(){
  const [data, setData] = useState(null);

  useEffect(()=>{ (async()=>{
    const r = await api.report(); // current week
    setData(r);
  })(); }, []);

  if(!data) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="text-sm text-neutral-600">Week starting: {new Date(data.fromISO).toLocaleDateString()}</div>

      <Card title={`Total Hours: ${data.totalHours}`}>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-80">
            <h3 className="font-medium mb-2">By Project</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hoursByProject}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="projectNumber" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-80">
            <h3 className="font-medium mb-2">By User</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hoursByUser}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="user" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
}
