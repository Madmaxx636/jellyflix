import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import type { Api } from '../api/jellyfin'
import { useLoad } from '../hooks/useLoad'
import { typesFor } from '../util/library'
import Browse from '../components/Browse'
import { ErrorBox, GridSkeleton } from '../components/Status'

/** One library, browsable by genre, sort and watched state. */
export default function Library({ api }: { api: Api }) {
  const { id = '' } = useParams()
  const { data: views, error, reload } = useLoad(api, 'views', a => a.views(), { remember: true })
  const view = views?.find(v => v.Id === id)

  const types = useMemo(() => typesFor(view?.CollectionType), [view?.CollectionType])
  const scope = useMemo(() => ({ parentId: id, types }), [id, types])

  if (error) return <div className="page"><ErrorBox error={error} what="this library" onRetry={reload} /></div>
  if (!views) return <div className="page"><GridSkeleton /></div>
  if (!view) return <p className="pad error" role="alert">That library wasn't found.</p>
  return <Browse api={api} title={view.Name} base={scope} genreScope={scope} typeSwitch={types.includes('Movie') && types.includes('Series')} />
}
