import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import type { Api } from '../api/jellyfin'
import { recall, remember } from './memory'

interface State<T> { token: string; data?: T; error?: Error; last?: T }

interface Options {
  /**
   * Keep the answer for this history entry. Going Back to the page then shows it at once, and asks again in the
   * background so what is shown is brought up to date (a failure then leaves what is showing alone).
   */
  remember?: boolean
  /** While a new key is loading, keep returning the answer for the previous one (a search that updates as you type). */
  keepPrevious?: boolean
}

/**
 * Loads something when a page appears, and again when `key` changes or `reload` is called. Requests still in flight are
 * cancelled when the page is left or the key changes. `loading` is true until the current load has answered.
 */
export function useLoad<T>(api: Api, key: string | number, load: (api: Api) => Promise<T>, { remember: keep = false, keepPrevious = false }: Options = {}) {
  const { key: entry } = useLocation()
  const navigation = useNavigationType()
  const slot = `load|${entry}|${key}`
  const [attempt, setAttempt] = useState(0)
  const token = `${key}#${attempt}`

  const latest = useRef(load)
  useEffect(() => { latest.current = load })

  const [state, setState] = useState<State<T>>(() => {
    const saved = keep && navigation === 'POP' ? recall<T>(slot) : undefined
    return saved !== undefined ? { token, data: saved, last: saved } : { token: '' }
  })

  useEffect(() => {
    const ctl = new AbortController()
    latest.current(api.with(ctl.signal)).then(
      data => {
        if (ctl.signal.aborted) return
        if (keep) remember(slot, data)
        setState({ token, data, last: data })
      },
      (error: Error) => {
        if (ctl.signal.aborted) return
        // Asking again for something already on screen: if that fails, what is on screen stays.
        setState(cur => (cur.token === token && cur.data !== undefined ? cur : { token, error, last: cur.last }))
      }
    )
    return () => ctl.abort()
  }, [api, token, keep, slot])

  const current = state.token === token
  return {
    data: current ? state.data : keepPrevious ? state.last : undefined,
    error: current ? state.error : undefined,
    loading: !current,
    reload: () => setAttempt(a => a + 1)
  }
}
