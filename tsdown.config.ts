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
        'nitropack',
        'h3',
        'vue-router',
        '@vue/runtime-core',
        '@nuxt/content',
        '@harlan-zw/comark-content',
      ],
    }),
  ],
})
