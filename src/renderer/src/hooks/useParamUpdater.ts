import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

// A choice that is the same as the page's starting point isn't written into the address, which keeps links short.
const STARTING_POINT: Record<string, string> = { type: 'all', filter: 'all' }

/**
 * The parameters in the address right now. The router shows a new address a moment after it was set, so building on what
 * the router last rendered could start from an address that is already out of date (typing a search and then picking a
 * filter straight away would lose the search). The app uses hash addresses (`#/search?q=…`), so they are read from there.
 */
function currentParams(): URLSearchParams {
  const { hash } = window.location
  const at = hash.indexOf('?')
  return new URLSearchParams(at >= 0 ? hash.slice(at + 1) : '')
}

/**
 * Returns a function that changes some of the page's address parameters (sort, filter, query…). An empty value, or the
 * starting choice for a parameter, removes it. It replaces the history entry, so Back leaves the page instead of undoing
 * each tweak.
 */
export function useParamUpdater() {
  const [, setParams] = useSearchParams()
  return useCallback((patch: Record<string, string>) => {
    const next = currentParams()
    for (const [k, v] of Object.entries(patch)) { if (v && v !== STARTING_POINT[k]) next.set(k, v); else next.delete(k) }
    setParams(next, { replace: true })
  }, [setParams])
}
