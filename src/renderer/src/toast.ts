import { useSyncExternalStore } from 'react'

export interface ToastMessage { id: number; text: string }

let toasts: ToastMessage[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

export function dismiss(id: number) {
  toasts = toasts.filter(t => t.id !== id)
  emit()
}

/** Shows a short message at the bottom of the window for a few seconds (at most three at once). */
export function toast(text: string, ms = 5000) {
  const id = nextId++
  toasts = [...toasts.slice(-2), { id, text }]
  emit()
  setTimeout(() => dismiss(id), ms)
}

export const useToasts = () => useSyncExternalStore(subscribe, () => toasts)
