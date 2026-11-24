// Interface size: the steps the app can be scaled to, and how a "bigger" or "smaller" key press moves between them.

export const SCALE_STEPS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const
export type ZoomKey = 'in' | 'out' | 'reset'

/** The step nearest to [scale] (a saved value may not be one of them). */
export function nearestStep(scale: number): number {
  return SCALE_STEPS.reduce((best, s) => (Math.abs(s - scale) < Math.abs(best - scale) ? s : best), 1 as number)
}

/** The scale after pressing "bigger", "smaller" or "reset". */
export function stepScale(current: number, key: ZoomKey): number {
  if (key === 'reset') return 1
  const i = SCALE_STEPS.indexOf(nearestStep(current) as (typeof SCALE_STEPS)[number])
  return SCALE_STEPS[Math.min(SCALE_STEPS.length - 1, Math.max(0, i + (key === 'in' ? 1 : -1)))]
}

/** Which scale key a key press is (Ctrl or Cmd with +, - or 0), if any. */
export function zoomKeyOf(input: { key: string; control: boolean; meta: boolean; alt: boolean }): ZoomKey | null {
  if (!(input.control || input.meta) || input.alt) return null
  if (input.key === '=' || input.key === '+') return 'in'
  if (input.key === '-' || input.key === '_') return 'out'
  if (input.key === '0') return 'reset'
  return null
}
