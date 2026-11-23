import { useEffect, useState } from 'react'

export type InputMode = 'touch' | 'mouse'
export type TouchSetting = 'auto' | 'on' | 'off'

/**
 * Touch or mouse controls. "On" and "off" are fixed. "Auto" follows what was used last: touching the screen switches to
 * touch, moving a mouse or trackpad switches back. Before anything has been used it goes by the device's main pointer
 * (a tablet's is coarse), so a laptop with a touch screen starts out with mouse controls.
 */
export function chooseInputMode(setting: TouchSetting, lastPointer: string | null, primaryIsCoarse: boolean): InputMode {
  if (setting === 'on') return 'touch'
  if (setting === 'off') return 'mouse'
  if (lastPointer === 'touch') return 'touch'
  if (lastPointer) return 'mouse' // mouse or pen
  return primaryIsCoarse ? 'touch' : 'mouse'
}

/** Keeps `<html data-input="touch|mouse">` up to date; the touch styles hang off it. */
export function useInputMode(setting: TouchSetting): InputMode {
  const [last, setLast] = useState<string | null>(null)
  const [coarse, setCoarse] = useState(() => window.matchMedia('(pointer: coarse)').matches)

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)')
    const on = () => setCoarse(query.matches)
    query.addEventListener('change', on)
    return () => query.removeEventListener('change', on)
  }, [])
  useEffect(() => {
    const seen = (e: PointerEvent) => setLast(e.pointerType) // the same value again does not render
    window.addEventListener('pointerdown', seen, true)
    window.addEventListener('pointermove', seen, true)
    return () => {
      window.removeEventListener('pointerdown', seen, true)
      window.removeEventListener('pointermove', seen, true)
    }
  }, [])

  const mode = chooseInputMode(setting, last, coarse)
  useEffect(() => { document.documentElement.dataset['input'] = mode }, [mode])
  return mode
}
