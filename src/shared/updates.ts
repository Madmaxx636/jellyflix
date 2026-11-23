// What the main process, the preload script and the page all agree on about updates.

export type UpdateState =
  /** Updates can't be installed here (a development build, say). */
  | { kind: 'off'; reason: string }
  | { kind: 'idle'; checkedAt?: number }
  | { kind: 'checking' }
  /** A newer version exists but this install can't update itself: the viewer downloads it. */
  | { kind: 'available'; version: string; url: string }
  | { kind: 'downloading'; version: string; percent: number }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string }

export interface UpdateInfo {
  state: UpdateState
  /** Whether the app looks for updates by itself. */
  auto: boolean
  current: string
}

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/

/** True when `latest` is a newer version than `current`: "0.2.0" over "0.1.3", and a release over its own pre-release. */
export function isNewer(latest: string, current: string): boolean {
  const a = VERSION.exec(latest.trim())
  const b = VERSION.exec(current.trim())
  if (!a || !b) return false
  for (let i = 1; i <= 3; i++) {
    const x = Number(a[i])
    const y = Number(b[i])
    if (x !== y) return x > y
  }
  const [preLatest, preCurrent] = [a[4], b[4]]
  if (preLatest === preCurrent) return false
  if (!preLatest) return true // 1.0.0 is newer than 1.0.0-beta
  if (!preCurrent) return false
  return preLatest > preCurrent
}
