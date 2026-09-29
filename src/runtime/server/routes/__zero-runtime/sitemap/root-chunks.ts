import { defineEventHandler } from '#nuxtseo/h3'

// Chunks are prerendered files at runtime; the middleware only serves dev and prerender.
export default defineEventHandler(async (e) => {
  if (import.meta.dev || import.meta.prerender) {
    const { sitemapRootChunkEventHandler } = await import('../../../sitemap/event-handlers')
    return sitemapRootChunkEventHandler(e)
  }
})
