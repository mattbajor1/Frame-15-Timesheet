export default function Select({ label, value, onChange, options = [], placeholder = "Select...", disabled = false }) {
  const id = Math.random().toString(36).slice(2)
  return (
    <label htmlFor={id} className="grid gap-1 text-sm">
      {label ? <span className="text-neutral-300">{label}</span> : null}
      <select
        id={id}
        className="bg-neutral-800 rounded-xl p-3 outline-none border border-neutral-700 disabled:opacity-60"
        value={value ?? ""}
        onChange={(e)=>onChange?.(e.target.value)}
        disabled={disabled}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt, i) => (
          typeof opt === 'object'
            ? <option key={opt.value ?? i} value={opt.value}>{opt.label ?? opt.value}</option>
            : <option key={i} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  )
}