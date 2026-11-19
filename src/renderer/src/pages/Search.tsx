import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Api, Item } from '../api/jellyfin'
import { Card } from '../components/Row'

export default function Search({ api }: { api: Api }) {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const [items, setItems] = useState<Item[]>([])
  useEffect(() => { if (q) api.search(q).then(setItems).catch(() => setItems([])); else setItems([]) }, [q, api])
  return (
    <div className="search-page">
      <h3>{q ? `Results for “${q}”` : 'Type to search'}</h3>
      <div className="grid">{items.map(i => <Card key={i.Id} item={i} api={api} />)}</div>
    </div>
  )
}
