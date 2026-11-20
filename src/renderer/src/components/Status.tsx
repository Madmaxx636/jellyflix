import { useTheme } from '../theme'

const range = (n: number) => Array.from({ length: n }, (_, i) => i)

/** Rows of shimmering cards, shaped like the real ones, while a page loads. */
export function RowsSkeleton({ rows = 3 }: { rows?: number }) {
  const { theme } = useTheme()
  const wide = theme.shape === 'landscape' ? ' wide' : ''
  return (
    <div className="skeleton-rows" aria-hidden="true">
      {range(rows).map(r => (
        <div className="skeleton-row" key={r}>
          <div className="skeleton-title" />
          <div className="skeleton-cards">{range(8).map(i => <div className={`skeleton-card${wide}`} key={i} />)}</div>
        </div>
      ))}
    </div>
  )
}

/** A grid of shimmering cards, for the first page of a list. */
export function GridSkeleton({ count = 18 }: { count?: number }) {
  const { theme } = useTheme()
  const wide = theme.shape === 'landscape' ? ' wide' : ''
  return <div className="grid skeleton-grid" aria-hidden="true">{range(count).map(i => <div className={`skeleton-card${wide}`} key={i} />)}</div>
}

/** Shimmering tiles, for the library and genre pages. */
export function TilesSkeleton({ count = 6 }: { count?: number }) {
  return <div className="tiles skeleton-tiles" aria-hidden="true">{range(count).map(i => <div className="skeleton-tile" key={i} />)}</div>
}

/** Plain text for short waits; read out by screen readers. */
export function Loading({ what = 'Loading' }: { what?: string }) {
  return <p className="count" role="status">{what}…</p>
}

/** What a page shows when its data couldn't be loaded, with a way to try again. */
export function ErrorBox({ error, what, onRetry }: { error: Error; what: string; onRetry?: () => void }) {
  return (
    <div className="errorbox" role="alert">
      <p><b>Couldn't load {what}.</b></p>
      <p className="detail">{error.message}</p>
      {onRetry && <button className="btn" onClick={onRetry}>Try again</button>}
    </div>
  )
}
