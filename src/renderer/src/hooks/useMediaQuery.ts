import { useEffect, useState } from 'react'

/** Whether a CSS media query holds right now, kept up to date as the window changes size. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const on = () => setMatches(list.matches)
    on()
    list.addEventListener('change', on)
    return () => list.removeEventListener('change', on)
  }, [query])
  return matches
}
