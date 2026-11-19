# Jellyflix

A Netflix-style desktop client for [Jellyfin](https://jellyfin.org), built with Electron, React and TypeScript.
Runs on Linux, Windows and macOS.

## Features
- One-click look switcher in the top bar: Netflix, Hulu, HBO and Disney+ styles (colors, card shape, hero, nav), remembered between launches
- Sign in with server address, username and password (session kept locally)
- Hero banner, Continue Watching, Next Up, Recently Added, and per-genre rows
- Title pages with season/episode lists and "More Like This"
- HLS playback with resume position and watch-progress reporting back to Jellyfin
- Search, keyboard shortcuts in the player (Space, ←/→ ±10s, F fullscreen, Esc back)

## Development
```bash
npm install
npm run dev
```

## Packaging
```bash
npm run dist   # AppImage/deb on Linux, nsis on Windows, dmg on macOS (build on each OS)
```

## Notes
Playback always goes through Jellyfin's HLS endpoint (H.264/AAC transcode when needed).
Direct play, subtitle/audio track selection and a "next episode" button are not done yet.
