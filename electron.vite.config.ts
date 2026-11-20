import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const { version } = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as { version: string }

export default defineConfig({
  main: { build: { rollupOptions: { input: resolve('src/main/index.ts') } } },
  renderer: {
    root: resolve('src/renderer'),
    // The player's chunk holds hls.js and is loaded only when something plays, so it may be larger than the default warning size.
    build: { minify: true, chunkSizeWarningLimit: 700, rollupOptions: { input: resolve('src/renderer/index.html') } },
    // The version the app reports to Jellyfin as its own, taken from package.json.
    define: { __APP_VERSION__: JSON.stringify(version) },
    plugins: [react()]
  }
})
