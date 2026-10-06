import { createError, defineEventHandler } from 'nuxt/server'

export default defineEventHandler(async (e) => {
  if (import.meta.dev || import.meta.prerender) {
    const { sitemapIndexXmlEventHandler } = await import('../../sitemap/event-handlers')
    return sitemapIndexXmlEventHandler(e)
  }
  throw createError({ status: 500, message: 'Sitemap not prerendered. zeroRuntime requires prerendering.' })
})
