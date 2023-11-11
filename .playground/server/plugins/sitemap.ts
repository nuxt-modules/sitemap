import { defineNitroPlugin } from 'nitropack/dist/runtime/plugin'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:output', async () => {
    // eslint-disable-next-line no-console
    console.log('Sitemap SSR hook')
  })
})
