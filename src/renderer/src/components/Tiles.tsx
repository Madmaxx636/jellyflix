import { CSSProperties, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Api, View } from '../api/jellyfin'
import { hueOf, typesFor } from '../util/library'

const tint = (name: string) => ({ ['--h' as string]: hueOf(name) }) as CSSProperties

/** A library tile: its own artwork if it has any, otherwise a backdrop from a title inside it. */
export function LibraryTile({ api, view }: { api: Api; view: View }) {
  const [art, setArt] = useState(view.ImageTags?.Primary ? api.image(view.Id, view.ImageTags.Primary, 640) : '')
  useEffect(() => {
    if (art) return
    let live = true
    api.items({ parentId: view.Id, types: typesFor(view.CollectionType), sortBy: 'Random', limit: 1 })
      .then(p => { const it = p.items[0]; if (live && it) setArt(api.backdrop(it, 640) || api.thumb(it, 640)) })
      .catch(() => {})
    return () => { live = false }
  }, [api, view.Id, view.CollectionType, art])
  return (
    <Link to={`/library/${view.Id}`} className="tile lib" style={tint(view.Name)} data-lib={view.Id}>
      {art && <img src={art} alt="" loading="lazy" />}
      <span className="tile-name">{view.Name}</span>
    </Link>
  )
}

/** A genre tile with a backdrop borrowed from one of its titles. */
export function GenreTile({ api, name }: { api: Api; name: string }) {
  const [art, setArt] = useState('')
  useEffect(() => {
    let live = true
    api.items({ types: ['Movie', 'Series'], genres: [name], sortBy: 'Random', limit: 1 })
      .then(p => { const it = p.items[0]; if (live && it) setArt(api.backdrop(it, 480) || api.thumb(it, 480)) })
      .catch(() => {})
    return () => { live = false }
  }, [api, name])
  return (
    <Link to={`/genre/${encodeURIComponent(name)}`} className="tile genre" style={tint(name)} data-genre={name}>
      {art && <img src={art} alt="" loading="lazy" />}
      <span className="tile-name">{name}</span>
    </Link>
  )
}
