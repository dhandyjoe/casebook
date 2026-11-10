import { defineConfig } from 'vitest/config'

// Dijalankan lewat `pnpm test:rules`, yang menyalakan emulator Firestore (butuh Java).
export default defineConfig({ test: { include: ['rules/**/*.test.ts'], environment: 'node' } })
