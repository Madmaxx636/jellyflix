import { useEffect } from 'react'

/** Puts the page's name in the window title ("Movies · Jellyflix"). */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Jellyflix` : 'Jellyflix'
    return () => { document.title = 'Jellyflix' }
  }, [title])
}
