import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Api } from '../api/jellyfin'
import { useTheme } from '../theme'
import { GenreTile } from '../components/Tiles'
import Browse from '../components/Browse'

const BOTH = { types: ['Movie', 'Series'] }

/** Every genre as a tile. */
export function Genres({ api }: { api: Api }) {
  const { theme } = useTheme()
  const [names, setNames] = useState<string[] | null>(null)
  useEffect(() => {
    let live = true
    api.genres().then(n => { if (live) setNames(n) }).catch(() => { if (live) setNames([]) })
    return () => { live = false }
  }, [api])
  return (
    <div className="page genres-page">
      <h1 className="page-title">{theme.words.genres}</h1>
      <div className="tiles genres">{names?.map(n => <GenreTile key={n} api={api} name={n} />)}</div>
      {names && !names.length && <p className="empty">No genres yet.</p>}
    </div>
  )
}

/** The titles in one genre. */
export function Genre({ api }: { api: Api }) {
  const { name = '' } = useParams()
  return <Browse api={api} title={name} base={BOTH} lockedGenre={name} typeSwitch />
}
