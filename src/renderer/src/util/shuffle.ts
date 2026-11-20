/** A number made from some text, to use as a seed (FNV-1a). */
export function seedFrom(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** A small generator that gives the same run of numbers for the same seed (mulberry32). */
function generator(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The same list in a different order, and the order depends only on the seed. That lets a page pick "random" titles to
 * feature and still pick the same ones when it is shown again, instead of changing under you.
 */
export function shuffled<T>(list: readonly T[], seed: number): T[] {
  const random = generator(seed)
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const held = out[i]
    out[i] = out[j]
    out[j] = held
  }
  return out
}
