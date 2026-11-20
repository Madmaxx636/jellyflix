import { dismiss, useToasts } from '../toast'

/** Where short messages appear. Announced politely to screen readers. */
export default function ToastHost() {
  const toasts = useToasts()
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map(t => (
        <div className="toast" key={t.id}>
          <span>{t.text}</span>
          <button aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
        </div>
      ))}
    </div>
  )
}
