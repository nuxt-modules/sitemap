import { createError, defineEventHandler, getRouterParam } from 'h3'
import { withoutLeadingSlash, withoutTrailingSlash } from 'ufo'
import { useSitemapRuntimeConfig } from '../../utils'
import { createSitemap } from '../../sitemap/nitro'
import { parseChunkInfo, getSitemapConfig } from '../../sitemap/utils/chunk'

export default defineEventHandler(async (e) => {
  const runtimeConfig = useSitemapRuntimeConfig(e)
  const { sitemaps } = runtimeConfig

  // Extract the sitemap name from the path
  let sitemapName = getRouterParam(e, 'sitemap')
  if (!sitemapName) {
    // Use the path to extract the sitemap name
    const path = e.path
    // Handle both regular paths and debug prefix
    const match = path.match(/(?:\/__sitemap__\/)?([^/]+)\.xml$/)
    if (match) {
      sitemapName = match[1]
    }
  }

  if (!sitemapName) {
    return createError({
      statusCode: 400,
      message: 'Invalid sitemap request',
    })
  }

  // Clean up the sitemap name
  sitemapName = withoutLeadingSlash(withoutTrailingSlash(sitemapName.replace('.xml', '')
    .replace('__sitemap__/', '')
    .replace(runtimeConfig.sitemapsPathPrefix || '', '')))

  // Parse chunk information and get appropriate config
  const chunkInfo = parseChunkInfo(sitemapName, sitemaps, runtimeConfig.defaultSitemapsChunkSize)

  // Validate that the sitemap or its base exists
  const isAutoChunked = typeof sitemaps.chunks !== 'undefined' && !Number.isNaN(Number(sitemapName))
  const sitemapExists = sitemapName in sitemaps || chunkInfo.baseSitemapName in sitemaps || isAutoChunked

  if (!sitemapExists) {
    return createError({
      statusCode: 404,
      message: `Sitemap "${sitemapName}" not found.`,
    })
  }

  // If trying to access a chunk of a non-chunked sitemap, return 404
  if (chunkInfo.isChunked && chunkInfo.chunkIndex !== undefined) {
    const baseSitemap = sitemaps[chunkInfo.baseSitemapName]
    if (baseSitemap && !baseSitemap.chunks && !baseSitemap._isChunking) {
      return createError({
        statusCode: 404,
        message: `Sitemap "${chunkInfo.baseSitemapName}" does not support chunking.`,
      })
    }

    // Validate chunk index if count is available
    if (baseSitemap?._chunkCount !== undefined && chunkInfo.chunkIndex >= baseSitemap._chunkCount) {
      return createError({
        statusCode: 404,
        message: `Chunk ${chunkInfo.chunkIndex} does not exist for sitemap "${chunkInfo.baseSitemapName}".`,
      })
    }
  }

  // Get the appropriate sitemap configuration
  const sitemapConfig = getSitemapConfig(sitemapName, sitemaps, runtimeConfig.defaultSitemapsChunkSize || 1000)

  return createSitemap(e, sitemapConfig, runtimeConfig)
})
