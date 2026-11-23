/// <reference types="vite/client" />

/** What the preload script (src/preload/index.ts) adds to the page. It is missing when the page runs outside the app. */
interface Window {
  jellyflix?: {
    updates: {
      info: () => Promise<import('../../shared/updates').UpdateInfo>
      check: () => Promise<import('../../shared/updates').UpdateInfo>
      install: () => Promise<void>
      setAuto: (on: boolean) => Promise<import('../../shared/updates').UpdateInfo>
      onChange: (listener: (info: import('../../shared/updates').UpdateInfo) => void) => () => void
    }
  }
}
