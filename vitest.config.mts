import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node', restoreMocks: true, unstubGlobals: true }
})
