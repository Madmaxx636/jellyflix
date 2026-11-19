import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Api, View } from '../api/jellyfin'
import { typesFor } from '../util/library'
import Browse from '../components/Browse'

/** One library, browsable by genre, sort and watched state. */
export default function Library({ api }: { api: Api }) {
  const { id } = useParams()
  const [view, setView] = useState<View | null | undefined>(undefined)
  useEffect(() => {
    let live = true
    setView(undefined)
    api.views().then(vs => { if (live) setView(vs.find(v => v.Id === id) ?? null) }).catch(() => { if (live) setView(null) })
    return () => { live = false }
  }, [api, id])

  const types = useMemo(() => typesFor(view?.CollectionType), [view?.CollectionType])
  const base = useMemo(() => ({ parentId: id, types }), [id, types])
  const scope = useMemo(() => ({ parentId: id, types }), [id, types])

  if (view === undefined) return <p className="pad">Loading…</p>
  if (view === null) return <p className="pad error">That library wasn't found.</p>
  return <Browse api={api} title={view.Name} base={base} genreScope={scope} typeSwitch={types.includes('Movie') && types.includes('Series')} />
}
