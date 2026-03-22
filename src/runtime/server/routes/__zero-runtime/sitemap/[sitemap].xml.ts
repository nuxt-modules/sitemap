import { createError, defineEventHandler } from 'h3'

export default defineEventHandler(async (e) => {
  if (import.meta.dev || import.meta.prerender) {
    const { sitemapChildXmlEventHandler } = await import('../../../sitemap/event-handlers')
    return sitemapChildXmlEventHandler(e)
  }
  throw createError({ statusCode: 500, message: 'Sitemap not prerendered. zeroRuntime requires prerendering.' })
})
