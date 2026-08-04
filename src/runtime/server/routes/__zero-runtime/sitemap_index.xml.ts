import { createError, defineEventHandler } from '#nuxtseo/h3'

export default defineEventHandler(async (e) => {
  if (import.meta.dev || import.meta.prerender) {
    const { sitemapIndexXmlEventHandler } = await import('../../sitemap/event-handlers')
    return sitemapIndexXmlEventHandler(e)
  }
  throw createError({ statusCode: 500, message: 'Sitemap not prerendered. zeroRuntime requires prerendering.' })
})
