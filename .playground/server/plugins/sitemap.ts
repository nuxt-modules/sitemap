import { defineNitroPlugin } from 'nitropack/runtime/plugin'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:ssr', async (ctx) => {
    console.log('Sitemap SSR', ctx)
  })
})
