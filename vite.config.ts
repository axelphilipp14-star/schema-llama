import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/schema-llama/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { main: resolve(__dirname, 'index.html'), live: resolve(__dirname, 'live-test.html') },
    },
  },
  test: { include: ['tests/**/*.test.ts'] },
})
