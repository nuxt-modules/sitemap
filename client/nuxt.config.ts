import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'pathe'

const layerDir = resolve(dirname(fileURLToPath(import.meta.resolve('nuxtseo-shared'))), 'layer-devtools')

export default defineNuxtConfig({
  extends: [layerDir],

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
