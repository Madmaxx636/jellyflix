/** Jellyfin counts time in ticks of 100 nanoseconds. */
export const ticksToMin = (ticks?: number) => (ticks ? Math.round(ticks / 600_000_000) : 0)

/** 83 → "1:23", 3725 → "1:02:05" */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(x).padStart(2, '0')}`
}
