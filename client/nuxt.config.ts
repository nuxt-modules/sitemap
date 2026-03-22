import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'pathe'

const __dirname = dirname(fileURLToPath(import.meta.url))

const sharedPkg = resolve(__dirname, '../node_modules/nuxtseo-shared')

export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@nuxt/fonts',
    '@nuxt/ui',
  ],

  sitemap: false,

  css: ['~/assets/css/global.css'],

  components: [
    '~/components',
    { path: resolve(sharedPkg, 'dist/runtime/app/components'), pathPrefix: false },
  ],

  // @ts-expect-error @nuxt/fonts module config
  fonts: {
    families: [
      { name: 'Hubot Sans' },
    ],
  },

  devtools: {
    enabled: false,
  },

  nitro: {
    prerender: {
      routes: [
        '/',
        '/user-sources',
        '/app-sources',
        '/debug',
        '/docs',
      ],
    },
    output: {
      publicDir: resolve(__dirname, '../dist/client'),
    },
  },

  app: {
    baseURL: '/__sitemap__/devtools',
  },

  compatibilityDate: '2025-03-13',
})
