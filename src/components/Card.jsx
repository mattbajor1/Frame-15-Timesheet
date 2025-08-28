export default function Card({ title, actions, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="space-x-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}