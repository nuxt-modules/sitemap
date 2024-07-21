import { createError, defineEventHandler } from 'h3'
import { useSimpleSitemapRuntimeConfig } from '../../utils'
import { createSitemap } from '../../sitemap/nitro'

export default defineEventHandler(async (e) => {
  const runtimeConfig = useSimpleSitemapRuntimeConfig(e)
  const { sitemaps } = runtimeConfig

  const sitemapName = e.context.params?.sitemap
  // check if sitemapName can be cast to a number safely
  const isChunking = typeof sitemaps.chunks !== 'undefined' && !Number.isNaN(Number(sitemapName))
  if (!sitemapName || (!(sitemapName in sitemaps) && !isChunking)) {
    return createError({
      statusCode: 404,
      message: `Sitemap "${sitemapName}" not found.`,
    })
  }
  return createSitemap(e, isChunking
    ? {
        ...sitemaps.chunks,
        sitemapName,
      }
    : sitemaps[sitemapName], runtimeConfig)
})
