import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import type { Api } from '../api/jellyfin'
import { useLoad } from '../hooks/useLoad'
import Browse from '../components/Browse'

/** An actor or director and everything of theirs in the library. */
export default function PersonPage({ api }: { api: Api }) {
  const { id = '' } = useParams()
  const { data: person, error } = useLoad(api, id, a => a.item(id), { remember: true })
  const base = useMemo(() => ({ types: ['Movie', 'Series'], personId: id }), [id])
  const photo = person?.ImageTags?.Primary ? api.image(person.Id, person.ImageTags.Primary, 320) : ''
  return (
    <Browse api={api} title={person?.Name ?? (error ? 'Person' : '')} base={base} hideFilter empty="Nothing in your library with this person."
      subtitle={person && (
        <div className="person-head">
          {photo && <img src={photo} alt={person.Name} />}
          {person.Overview && <p>{person.Overview}</p>}
        </div>
      )} />
  )
}
