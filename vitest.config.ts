/// <reference types="vitest" />
/// <reference types="vitest/globals" />

import { defineConfig } from 'vite'
import { isCI } from 'std-env'

export default defineConfig({
  test: {
    isolate: true,
    threads: isCI, // kills my computer
    testTimeout: 300000, // 5 minutes
    hookTimeout: 300000, // 5 minutes,
    deps: {
      inline: [
        '@nuxt/test-utils',
        '@nuxt/test-utils-edge',
      ],
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
