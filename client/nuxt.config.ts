import { resolve } from 'pathe'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxt/fonts',
    '@nuxt/ui',
  ],
  ssr: false,
  content: false,
  sitemap: false,
  devtools: false,

  app: {
    baseURL: '/__sitemap__/devtools',
  },

  css: ['~/assets/css/global.css'],

  compatibilityDate: '2025-03-13',

  nitro: {
    output: {
      publicDir: resolve(__dirname, '../dist/client'),
    },
  },

  fonts: {
    families: [
      { name: 'Hubot Sans' },
    ],
  },
})
