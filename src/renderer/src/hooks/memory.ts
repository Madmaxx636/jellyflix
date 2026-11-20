// What a page remembers about itself for one history entry, so that Back finds it as you left it (instead of loading it
// all again and dropping you at the top). Kept in memory only, for a while, and never more than a few dozen pages.

const MAX_ENTRIES = 40
const MAX_AGE_MS = 10 * 60_000
const store = new Map<string, { at: number; value: unknown }>()

export function remember(slot: string, value: unknown) {
  store.delete(slot)
  store.set(slot, { at: Date.now(), value })
  while (store.size > MAX_ENTRIES) store.delete(store.keys().next().value as string)
}

export function recall<T>(slot: string): T | undefined {
  const entry = store.get(slot)
  if (!entry) return undefined
  if (Date.now() - entry.at > MAX_AGE_MS) { store.delete(slot); return undefined }
  return entry.value as T
}

/** Artwork picked for library and genre tiles, so they don't change (or get asked for again) every time you come back. */
export const artCache = new Map<string, string>()

/** Forget everything, e.g. when someone signs out. */
export function forgetAll() {
  store.clear()
  artCache.clear()
}
