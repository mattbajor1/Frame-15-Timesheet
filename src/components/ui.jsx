export function Card({ className="", children }) {
  return <section className={`bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 ${className}`}>{children}</section>
}
export function SectionTitle({ children, right=null }) {
  return <div className="flex items-center justify-between mb-3"><h2 className="text-lg font-semibold">{children}</h2>{right}</div>
}
export function Button({ children, variant="primary", className="", ...props }) {
  const styles = { primary:"border border-emerald-500/50 hover:bg-emerald-500/10", danger:"border border-red-500/50 hover:bg-red-500/10", subtle:"border border-neutral-700 hover:bg-neutral-900/60" }[variant]
  return <button className={`rounded-xl px-4 py-2 text-sm ${styles} ${className}`} {...props}>{children}</button>
}
export function Badge({ children, tone="neutral" }) {
  const map = { neutral:"border-neutral-700 text-neutral-300", good:"border-emerald-500/50 text-emerald-300", warn:"border-amber-500/50 text-amber-300", danger:"border-red-500/50 text-red-300" }
  return <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs ${map[tone]}`}>{children}</span>
}