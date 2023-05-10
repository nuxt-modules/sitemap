import { defineNitroPlugin } from 'nitropack/runtime/plugin'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sitemap-xml', async (ctx) => {
    console.log('Sitemap SSR hook')
  })
})
