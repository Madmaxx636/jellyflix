import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { Api, View } from '../api/jellyfin'
import { artCache } from '../hooks/memory'
import { hueOf, typesFor } from '../util/library'

const tint = (name: string) => ({ ['--h' as string]: hueOf(name) }) as CSSProperties

/** A tile's picture: the one given, or else one found once (and then remembered) by asking the server. */
function useTileArt(api: Api, cacheKey: string, own: string, find: (api: Api) => Promise<string>) {
  const [found, setFound] = useState(() => artCache.get(cacheKey) ?? '')
  const latest = useRef(find)
  useEffect(() => { latest.current = find })
  const art = own || found
  useEffect(() => {
    if (art) return
    const ctl = new AbortController()
    latest.current(api.with(ctl.signal)).then(url => {
      if (ctl.signal.aborted || !url) return
      artCache.set(cacheKey, url)
      setFound(url)
    }, () => { /* no picture is fine: the tile has a colour */ })
    return () => ctl.abort()
  }, [api, cacheKey, art])
  return art
}

/** A library tile: its own artwork if it has any, otherwise a backdrop from a title inside it. */
export function LibraryTile({ api, view }: { api: Api; view: View }) {
  const own = view.ImageTags?.Primary ? api.image(view.Id, view.ImageTags.Primary, 640) : ''
  const art = useTileArt(api, `library|${view.Id}`, own, async a => {
    const page = await a.items({ parentId: view.Id, types: typesFor(view.CollectionType), sortBy: 'Random', limit: 1 })
    const it = page.items[0]
    return it ? a.backdrop(it, 640) || a.thumb(it, 640) : ''
  })
  return (
    <Link to={`/library/${encodeURIComponent(view.Id)}`} className="tile lib" style={tint(view.Name)} data-lib={view.Id}>
      {art && <img src={art} alt="" loading="lazy" />}
      <span className="tile-name">{view.Name}</span>
    </Link>
  )
}

/** A genre tile with a backdrop borrowed from one of its titles. */
export function GenreTile({ api, name }: { api: Api; name: string }) {
  const art = useTileArt(api, `genre|${name}`, '', async a => {
    const page = await a.items({ types: ['Movie', 'Series'], genres: [name], sortBy: 'Random', limit: 1 })
    const it = page.items[0]
    return it ? a.backdrop(it, 480) || a.thumb(it, 480) : ''
  })
  return (
    <Link to={`/genre/${encodeURIComponent(name)}`} className="tile genre" style={tint(name)} data-genre={name}>
      {art && <img src={art} alt="" loading="lazy" />}
      <span className="tile-name">{name}</span>
    </Link>
  )
}
