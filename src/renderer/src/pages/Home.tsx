import { useEffect, useState } from 'react'
import { Api, Item } from '../api/jellyfin'
import Hero from '../components/Hero'
import Row from '../components/Row'

interface Rows { title: string; items: Item[] }

export default function Home({ api }: { api: Api }) {
  const [rows, setRows] = useState<Rows[]>([])
  const [hero, setHero] = useState<Item | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const [resume, nextUp, movies, shows, genres] = await Promise.all([
          api.resume(), api.nextUp(), api.latest('Movie'), api.latest('Series'), api.genres()
        ])
        const genreRows = await Promise.all(
          genres.slice(0, 8).map(async g => ({ title: g, items: await api.byGenre(g) }))
        )
        if (!live) return
        // Pick a hero with a backdrop and overview, preferring recently added titles.
        const pool = [...movies, ...shows].filter(i => i.BackdropImageTags?.length && i.Overview)
        setHero(pool[Math.floor(Math.random() * Math.min(pool.length, 8))] ?? null)
        setRows([
          { title: 'Continue Watching', items: resume },
          { title: 'Next Up', items: nextUp },
          { title: 'Recently Added Movies', items: movies },
          { title: 'Recently Added Shows', items: shows },
          ...genreRows
        ])
      } catch (e) { if (live) setErr((e as Error).message) }
    })()
    return () => { live = false }
  }, [api])

  if (err) return <p className="error pad">Failed to load library: {err}</p>
  return (
    <>
      {hero && <Hero item={hero} api={api} />}
      <div className={hero ? 'rows' : 'rows nohero'}>
        {rows.map(r => <Row key={r.title} title={r.title} items={r.items} api={api} />)}
      </div>
    </>
  )
}
