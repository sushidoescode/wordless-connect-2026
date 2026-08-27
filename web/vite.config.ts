/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@wordless/core': fileURLToPath(
        new URL('../Assets/Wordless/Scripts/Core', import.meta.url),
      ),
    },
  },
  server: {
    fs: { allow: [repositoryRoot] },
  },
  test: { include: ['tests/**/*.test.ts'] },
})
