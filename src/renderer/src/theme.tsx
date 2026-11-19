import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type ThemeId = 'netflix' | 'hulu' | 'hbo' | 'disney'

export interface Theme {
  id: ThemeId
  label: string
  /** Poster = tall 2:3 cards, landscape = wide 16:9 tiles using backdrop art. */
  shape: 'poster' | 'landscape'
  logo: string
}

export const THEMES: Theme[] = [
  { id: 'netflix', label: 'Netflix', shape: 'poster', logo: 'JELLYFLIX' },
  { id: 'hulu', label: 'Hulu', shape: 'landscape', logo: 'jellyflix' },
  { id: 'hbo', label: 'HBO', shape: 'landscape', logo: 'JELLY MAX' },
  { id: 'disney', label: 'Disney+', shape: 'poster', logo: 'Jellyflix+' }
]

const KEY = 'jellyflix.theme'
const Ctx = createContext<{ theme: Theme; setTheme: (id: ThemeId) => void }>(null!)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(KEY) as ThemeId | null
    return THEMES.some(t => t.id === saved) ? saved! : 'netflix'
  })
  const theme = THEMES.find(t => t.id === id)!
  useEffect(() => {
    document.documentElement.dataset.theme = id
    localStorage.setItem(KEY, id)
  }, [id])
  return <Ctx.Provider value={{ theme, setTheme: setId }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
