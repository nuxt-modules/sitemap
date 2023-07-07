/// <reference types="vitest" />
/// <reference types="vitest/globals" />

import { defineConfig } from 'vite'
import { isCI } from 'std-env'

export default defineConfig({
  test: {
    threads: isCI, // kills my computer
    deps: {
      inline: [
        '@nuxt/test-utils',
        '@nuxt/test-utils-edge',
      ],
    },
    watchExclude: [
      'dist',
      'playground',
      'test/**/*',
      '**/.nuxt/**/*',
      '**/.output/**/*',
    ],
  },
})
