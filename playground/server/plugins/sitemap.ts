import { defineNitroPlugin } from '#imports'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:output', async () => {
    // eslint-disable-next-line no-console
    console.log('Sitemap SSR hook')
  })
  nitroApp.hooks.hook('sitemap:index-resolved', (ctx) => {
    // eslint-disable-next-line no-console
    console.log('Sitemap index resolved hook', ctx)
  })
})
