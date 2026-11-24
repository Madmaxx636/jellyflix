import { useEffect, useState } from 'react'

export interface ExternalPlayer { id: string; name: string }

/** The other players (mpv, VLC) installed on this computer, once the app has found out. Empty outside the desktop app. */
export function useExternalPlayers(): ExternalPlayer[] {
  const [players, setPlayers] = useState<ExternalPlayer[]>([])
  useEffect(() => {
    let live = true
    void window.jellyflix?.players.list().then(list => { if (live) setPlayers(list) }, () => { /* none */ })
    return () => { live = false }
  }, [])
  return players
}
