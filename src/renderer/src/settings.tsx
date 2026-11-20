import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { defaultSettings, normalizeSettings, type Settings } from './settingsModel'

const KEY = 'jellyflix.settings'

const prefersReducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

function load(): Settings {
  try { return normalizeSettings(JSON.parse(localStorage.getItem(KEY) ?? 'null'), prefersReducedMotion()) } catch { return defaultSettings(prefersReducedMotion()) }
}

interface Ctx {
  settings: Settings
  set: (patch: Partial<Settings>) => void
  setRow: (key: keyof Settings['rows'], on: boolean) => void
  reset: () => void
}
const SettingsCtx = createContext<Ctx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* storage unavailable */ }
    document.documentElement.dataset['cards'] = settings.cardSize
    document.documentElement.dataset['motion'] = settings.reduceMotion ? 'reduced' : 'full'
  }, [settings])
  const set = useCallback((patch: Partial<Settings>) => setSettings(s => ({ ...s, ...patch })), [])
  const setRow = useCallback((key: keyof Settings['rows'], on: boolean) => setSettings(s => ({ ...s, rows: { ...s.rows, [key]: on } })), [])
  const reset = useCallback(() => setSettings(defaultSettings(prefersReducedMotion())), [])
  const value = useMemo(() => ({ settings, set, setRow, reset }), [settings, set, setRow, reset])
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsCtx)
  if (!ctx) throw new Error('useSettings needs a SettingsProvider above it')
  return ctx
}
