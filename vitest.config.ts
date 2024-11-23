/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { defineVitestConfig } from '@nuxt/test-utils/config'
import { isCI } from 'std-env'

export default defineVitestConfig({
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
  },
})
