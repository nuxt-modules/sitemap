import { resolve } from 'pathe'
import DevtoolsUIKit from '@nuxt/devtools-ui-kit'

export default defineNuxtConfig({
  modules: [
    DevtoolsUIKit,
  ],

  ssr: false,

  devtools: {
    enabled: false,
  },

  app: {
    baseURL: '/__sitemap__/devtools',
  },

  compatibilityDate: '2025-03-13',

  nitro: {
    output: {
      publicDir: resolve(__dirname, '../dist/client'),
    },
  },
})
