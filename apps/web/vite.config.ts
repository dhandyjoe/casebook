/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.{ts,tsx}'], environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.ts'],
    coverage: { include: ['src/**/*.{ts,tsx}'], exclude: ['**/*.test.*', 'src/lib/fakeFirestore.ts', 'src/test-setup.ts'] },
  },
})
