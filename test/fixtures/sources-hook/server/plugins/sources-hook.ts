import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sources', async (ctx) => {
    // Add a new source dynamically using simple string syntax
    ctx.sources.push('/api/dynamic-source')

    // Add a source to be filtered (also using simple string syntax)
    ctx.sources.push('/api/skip-this')

    // Modify existing sources to add headers
    ctx.sources = ctx.sources.map((source) => {
      if (typeof source === 'object' && 'fetch' in source && source.fetch === '/api/initial-source') {
        // Modify fetch to add headers
        source.fetch = ['/api/initial-source', { headers: { 'X-Hook-Modified': 'true' } }]
      }
      return source
    })

    // Filter out sources we don't want
    ctx.sources = ctx.sources.filter((source) => {
      if (typeof source === 'string')
        return !source.includes('skip-this')
      if (typeof source === 'object' && 'fetch' in source && source.fetch) {
        const fetchUrl = Array.isArray(source.fetch) ? source.fetch[0] : source.fetch
        return !fetchUrl.includes('skip-this')
      }
      return true
    })
  })
})
