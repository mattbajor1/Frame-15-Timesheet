export default function Select({ label, value, onChange, options = [], placeholder = 'Select…' }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-neutral-300">{label}</span>
      <select
        className="bg-neutral-800 rounded-xl p-3 outline-none border border-neutral-700"
        value={value}
        onChange={(e)=>onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  )
}
