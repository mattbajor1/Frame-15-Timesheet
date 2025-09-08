import { useShift } from "../contexts/ShiftContext.js";

export default function Work() {
  const { active, today, week, start, stop } = useShift();
  const fmt = (h) => (h < 0.25 ? `${Math.round(h * 60)} min` : `${h.toFixed(2)} h`);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
        <div className="text-xl font-semibold mb-2">Your shift</div>
        {active ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">Clocked in since</div>
            <div className="text-lg">{new Date(active.inISO).toLocaleTimeString()}</div>
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={stop}>Clock out</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">Not on the clock</div>
            <button className="px-4 py-2 rounded-xl font-semibold bg-white text-black" onClick={start}>Clock in</button>
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
