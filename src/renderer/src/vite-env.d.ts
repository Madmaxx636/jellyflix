/// <reference types="vite/client" />

/** What the preload script (src/preload/index.ts) adds to the page. It is missing when the page runs outside the app. */
interface Window {
  jellyflix?: {
    certificates: {
      list: () => Promise<string[]>
      forget: (host: string) => Promise<string[]>
    }
    players: {
      list: () => Promise<import('../../shared/players').PlayerInfo[]>
      open: (url: string, title: string, player: string) => Promise<string | null>
    }
    view: {
      setScale: (factor: number) => void
      onZoomKey: (listener: (key: import('../../shared/zoom').ZoomKey) => void) => () => void
    }
    updates: {
      info: () => Promise<import('../../shared/updates').UpdateInfo>
      check: () => Promise<import('../../shared/updates').UpdateInfo>
      install: () => Promise<void>
      setAuto: (on: boolean) => Promise<import('../../shared/updates').UpdateInfo>
      onChange: (listener: (info: import('../../shared/updates').UpdateInfo) => void) => () => void
    }
  }
}
