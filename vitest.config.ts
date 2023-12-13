/// <reference types="vitest" />
/// <reference types="vitest/globals" />

import { defineConfig } from 'vite'
import { isCI } from 'std-env'

export default defineConfig({
  test: {
    isolate: true,
    poolOptions: {
      threads: {
        singleThread: !isCI,
      },
    },
    include: [
      'test/integration/**',
      'test/unit/**',
    ],
    watchExclude: [
      'dist',
      'playground',
      'test/**/*',
      '**/.nuxt/**/*',
      '**/.output/**/*',
    ],
  },
})
