import { resolve } from 'pathe'

export default defineNuxtConfig({
  extends: ['nuxtseo-layer-devtools'],

  sitemap: false,

  imports: {
    autoImport: true,
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
      publicDir: resolve(__dirname, '../dist/devtools'),
    },
  },

  app: {
    baseURL: '/__nuxt-sitemap',
  },
})
