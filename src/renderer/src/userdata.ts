import { useSyncExternalStore } from 'react'
import type { Api, Item } from './api/jellyfin'

/**
 * My List and watched state changes the moment you click, everywhere on screen, before the server has answered.
 * The server's answer wins if it fails (the change is rolled back).
 *
 * A local change only applies to copies of a title fetched BEFORE it was made. Anything fetched afterwards already
 * carries the server's own answer (which may include changes made in another Jellyfin app), so it is trusted.
 */
interface Flags { fav?: boolean; played?: boolean; t: number }
const overrides = new Map<string, Flags>()
const fetchedAt = new WeakMap<object, number>()
const listeners = new Set<() => void>()
let version = 0

const emit = () => { version++; listeners.forEach(l => l()) }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

/** Remember when titles were asked for, so older local changes don't override them. */
export function markFetched(items: (Item | null | undefined)[], since: number) {
  for (const it of items) if (it) fetchedAt.set(it, since)
}

/** Re-renders the caller whenever any flag changes. */
export const useFlagsVersion = () => useSyncExternalStore(subscribe, () => version)

export function flagsOf(item: Item): { fav: boolean; played: boolean } {
  const o = overrides.get(item.Id)
  const live = o && (fetchedAt.get(item) ?? 0) <= o.t ? o : undefined
  return { fav: live?.fav ?? !!item.UserData?.IsFavorite, played: live?.played ?? !!item.UserData?.Played }
}
export function useFlags(item: Item) {
  useFlagsVersion()
  return flagsOf(item)
}

function change(item: Item, patch: { fav?: boolean; played?: boolean }) {
  overrides.set(item.Id, { ...overrides.get(item.Id), ...patch, t: Date.now() })
  emit()
}

export async function toggleFavorite(api: Api, item: Item, to?: boolean) {
  const prev = flagsOf(item).fav
  const next = to ?? !prev
  change(item, { fav: next })
  try { await api.setFavorite(item.Id, next) } catch { change(item, { fav: prev }) }
}

export async function togglePlayed(api: Api, item: Item, to?: boolean) {
  const prev = flagsOf(item).played
  const next = to ?? !prev
  change(item, { played: next })
  try { await api.setPlayed(item.Id, next) } catch { change(item, { played: prev }) }
}

/** Forget everything on sign-out so the next profile starts clean. */
export function clearFlags() { overrides.clear(); emit() }
