import { useState } from 'react'
import { useExternalPlayers } from '../../hooks/useExternalPlayers'
import { useSettings } from '../../settings'

/**
 * "Open in mpv" / "Open in VLC" for a file this player can't play. The file is handed over as it is, so nothing is converted.
 * With none installed it says where to get one.
 */
export default function ExternalPlayerButtons({ fileUrl, title }: { fileUrl: string; title: string }) {
  const players = useExternalPlayers()
  const { settings } = useSettings()
  const [problem, setProblem] = useState('')
  if (!fileUrl) return null
  const shown = settings.externalPlayer === 'auto' ? players : players.filter(p => p.id === settings.externalPlayer)
  const open = async (id: string) => {
    setProblem((await window.jellyflix?.players.open(fileUrl, title, id)) ?? '')
  }
  return (
    <div className="pc-external">
      {(shown.length ? shown : players).map(p => <button key={p.id} className="btn primary" data-act={`external-${p.id}`} onClick={() => void open(p.id)}>Open in {p.name}</button>)}
      {!players.length && <p className="pc-hint">To play it without converting, install mpv or VLC, then try again.</p>}
      {problem && <p className="pc-hint" role="alert">{problem}</p>}
    </div>
  )
}
