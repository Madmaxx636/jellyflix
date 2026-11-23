import { useEffect, useState } from 'react'
import type { UpdateInfo } from '../../../shared/updates'

/** Where the app stands on updates, and ways to act on it. `info` is null outside the app (no bridge to the main process). */
export function useUpdates() {
  const bridge = window.jellyflix?.updates
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  useEffect(() => {
    if (!bridge) return
    let live = true
    bridge.info().then(i => { if (live) setInfo(i) }, () => { /* no updates shown */ })
    const stop = bridge.onChange(i => { if (live) setInfo(i) })
    return () => { live = false; stop() }
  }, [bridge])
  return {
    info,
    check: () => { void bridge?.check().then(setInfo) },
    install: () => { void bridge?.install() },
    setAuto: (on: boolean) => { void bridge?.setAuto(on).then(setInfo) }
  }
}

/** One line for Settings: what the update check found. */
export function describeUpdate(info: UpdateInfo): string {
  const s = info.state
  switch (s.kind) {
    case 'off': return s.reason
    case 'idle': return s.checkedAt ? `You have the latest version (${info.current}), checked ${new Date(s.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` : `Version ${info.current}.`
    case 'checking': return 'Checking…'
    case 'available': return `Version ${s.version} is available.`
    case 'downloading': return `Downloading version ${s.version} (${s.percent}%)…`
    case 'ready': return `Version ${s.version} is ready: restart to install it.`
    case 'error': return `Couldn't check: ${s.message}`
  }
}
