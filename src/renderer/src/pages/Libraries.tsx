import { useEffect, useState } from 'react'
import type { Api, Item, View } from '../api/jellyfin'
import { useTheme } from '../theme'
import { isBrowsable } from '../util/library'
import { LibraryTile } from '../components/Tiles'
import Row from '../components/Row'

/** Every video library on the server, plus its collections. Called Hubs, Brands or Libraries depending on the look. */
export default function Libraries({ api }: { api: Api }) {
  const { theme } = useTheme()
  const [views, setViews] = useState<View[] | null>(null)
  const [collections, setCollections] = useState<Item[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    api.views().then(v => { if (live) setViews(v.filter(isBrowsable)) }).catch(e => { if (live) { setViews([]); setErr((e as Error).message) } })
    api.items({ types: ['BoxSet'], sortBy: 'SortName', limit: 24 }).then(p => { if (live) setCollections(p.items) }).catch(() => {})
    return () => { live = false }
  }, [api])

  return (
    <div className="page libraries">
      <h1 className="page-title">{theme.words.libraries}</h1>
      {err && <p className="error">Couldn't load libraries: {err}</p>}
      <div className="tiles libs">{views?.map(v => <LibraryTile key={v.Id} api={api} view={v} />)}</div>
      {views && !views.length && !err && <p className="empty">No video libraries were found for this account.</p>}
      <Row title={theme.words.collections} items={collections} api={api} to="/collections" />
    </div>
  )
}
