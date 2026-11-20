import type { ReactNode } from 'react'

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} aria-label={label} />
      <span className="track"><span className="thumb" /></span>
    </label>
  )
}

export function SettingRow({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="set-row" data-setting={id}>
      <div className="set-label"><b>{label}</b>{hint && <small>{hint}</small>}</div>
      <div className="set-control">{children}</div>
    </div>
  )
}

/** A drop-down for a fixed set of choices. */
export function Select<T extends string | number>({ id, value, onChange, options, label }: {
  id?: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label: string
}) {
  return (
    <select id={id} value={String(value)} aria-label={label}
      onChange={e => { const o = options.find(x => String(x.value) === e.target.value); if (o) onChange(o.value) }}>
      {options.map(o => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
    </select>
  )
}
