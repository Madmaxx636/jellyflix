import { useEffect, useState } from 'react'
import type { Api, Item, Query } from '../api/jellyfin'
import { useTheme } from '../theme'
import Row from '../components/Row'

interface RowDef { key: string; title: string; items: Item[]; to: string; ranked?: boolean }

/** New & Popular / Just Added: what arrived lately, what is newest, what is rated best, and unwatched picks. */
export default function NewPopular({ api }: { api: Api }) {
  const { theme } = useTheme()
  const w = theme.words
  const [rows, setRows] = useState<RowDef[] | null>(null)

  useEffect(() => {
    let live = true
    const q = (query: Query) =>
      api.items({ types: ['Movie', 'Series'], limit: 20, ...query }).then(p => p.items).catch(() => [] as Item[])
    Promise.all([
      q({ sortBy: 'DateCreated', sortOrder: 'Descending' }),
      q({ sortBy: 'PremiereDate', sortOrder: 'Descending' }),
      q({ sortBy: 'CommunityRating', sortOrder: 'Descending' }),
      q({ filters: ['IsUnplayed'], sortBy: 'Random' })
    ]).then(([added, released, top, picks]) => {
      if (!live) return
      setRows([
        { key: 'added', title: 'Recently Added', items: added, to: '/movies?sort=added' },
        { key: 'released', title: 'New Releases', items: released, to: '/movies?sort=released' },
        { key: 'top', title: w.topRated, items: top, to: '/movies?sort=rating', ranked: theme.top10 },
        { key: 'picks', title: "Something You Haven't Seen", items: picks, to: '/movies?filter=unplayed' }
      ])
    })
    return () => { live = false }
  }, [api, w.topRated, theme.top10])

  return (
    <div className="page new-page">
      <h1 className="page-title">{w.newPage}</h1>
      {rows === null && <p className="count">Loading…</p>}
      {rows?.map(r => <Row key={r.key} title={r.title} items={r.items} api={api} ranked={r.ranked} to={r.to} />)}
      {rows && rows.every(r => !r.items.length) && <p className="empty">Nothing here yet.</p>}
    </div>
  )
}
