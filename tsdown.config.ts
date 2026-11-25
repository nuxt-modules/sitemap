import { builder } from '@nuxt/module-builder/tsdown'
import { defineConfig } from 'tsdown'

export default defineConfig({
  plugins: [
    builder({
      entries: [
        './src/content',
        './src/content-valibot',
        './src/utils',
      ],
      externals: [
        'nuxt',
        'nuxt/schema',
        '@nuxt/kit',
        '@nuxt/schema',
        'nitropack',
        'nitropack/types',
        'h3',
        'vue',
        'vue-router',
        '@vue/runtime-core',
        '#imports',
        '@nuxt/content',
        '@harlan-zw/comark-content',
        '@harlan-zw/comark-content/server',
        'valibot',
        'zod',
        'sitemapd',
        'nuxt/server',
      ],
    }),
  ],
})
