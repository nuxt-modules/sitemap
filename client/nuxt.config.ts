import { resolve } from 'pathe'

export default defineNuxtConfig({
  extends: ['nuxtseo-layer-devtools'],

  sitemap: false,

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
})
