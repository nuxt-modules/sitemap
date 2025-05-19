import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sources', async (ctx) => {
    // Add a new source dynamically
    ctx.sources.push({ sourceType: 'user', fetch: '/api/dynamic-source' })

    // Add a source to be filtered
    ctx.sources.push({ sourceType: 'user', fetch: '/api/skip-this' })

    // Modify existing sources to add headers
    ctx.sources = ctx.sources.map((source) => {
      if (typeof source === 'object' && source.fetch === '/api/initial-source') {
        // Modify fetch to add headers
        source.fetch = ['/api/initial-source', { headers: { 'X-Hook-Modified': 'true' } }]
      }
      return source
    })

    // Filter out sources we don't want
    ctx.sources = ctx.sources.filter((source) => {
      if (typeof source === 'object' && source.fetch) {
        return !source.fetch.includes('skip-this')
      }
      return true
    })
  })
})
