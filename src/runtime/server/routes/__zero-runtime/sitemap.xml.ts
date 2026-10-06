import { createError, defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (e) => {
  if (import.meta.dev || import.meta.prerender) {
    const { sitemapXmlEventHandler } = await import('../../sitemap/event-handlers')
    return sitemapXmlEventHandler(e)
  }
  throw createError({ status: 500, message: 'Sitemap not prerendered. zeroRuntime requires prerendering.' })
})
