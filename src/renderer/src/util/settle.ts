/**
 * Waits for several requests that don't depend on each other. A request that fails leaves `fallback` in its place, so one
 * missing row doesn't blank the page. If every one of them fails, the first error is thrown: that means the server
 * can't be reached, and the page should say so instead of looking empty.
 */
export async function allOrFallback<T>(calls: readonly Promise<T>[], fallback: T): Promise<T[]> {
  const settled = await Promise.allSettled(calls)
  const failed = settled.find(r => r.status === 'rejected')
  if (failed && settled.every(r => r.status === 'rejected')) throw failed.reason
  return settled.map(r => (r.status === 'fulfilled' ? r.value : fallback))
}
