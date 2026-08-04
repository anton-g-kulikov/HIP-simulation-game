/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const alias = {
  '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)),
  '@content': fileURLToPath(new URL('./src/content', import.meta.url)),
  '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
  '@devtools': fileURLToPath(new URL('./src/devtools', import.meta.url)),
  '@persistence': fileURLToPath(new URL('./src/persistence', import.meta.url)),
  '@telemetry': fileURLToPath(new URL('./src/telemetry', import.meta.url)),
}

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  // Honour PORT so the harness can assign a free port; falls back to Vite's default.
  server: { port: Number(process.env.PORT) || 5173, strictPort: false },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    environmentMatchGlobs: [['test/app/**', 'jsdom']],
    setupFiles: ['./test/setup.ts'],
  },
})
