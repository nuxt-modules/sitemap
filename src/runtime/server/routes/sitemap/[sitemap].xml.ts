import { createError, defineEventHandler, getRouterParam } from 'h3'
import { withoutLeadingSlash, withoutTrailingSlash } from 'ufo'
import { useSitemapRuntimeConfig } from '../../utils'
import { createSitemap } from '../../sitemap/nitro'

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

  // Check if this is an auto-chunked sitemap (numeric name)
  const isAutoChunking = typeof sitemaps.chunks !== 'undefined' && !Number.isNaN(Number(sitemapName))

  // Check if this is a chunked named sitemap (format: name-number)
  let isNamedChunking = false
  let baseSitemapName = sitemapName
  let chunkIndex: number | undefined

  if (sitemapName.includes('-')) {
    const parts = sitemapName.split('-')
    const lastPart = parts.pop()
    if (!Number.isNaN(Number(lastPart))) {
      baseSitemapName = parts.join('-')
      chunkIndex = Number(lastPart)
      // Check if the base sitemap has chunking enabled
      const baseSitemapConfig = sitemaps[baseSitemapName]
      if (baseSitemapConfig && (baseSitemapConfig.chunks || baseSitemapConfig._isChunking)) {
        isNamedChunking = true
      }
      // If trying to access chunk of non-chunked sitemap, return 404
      else if (baseSitemapConfig && !(baseSitemapConfig.chunks || baseSitemapConfig._isChunking)) {
        return createError({
          statusCode: 404,
          message: `Sitemap "${baseSitemapName}" does not support chunking.`,
        })
      }
    }
  }

  // Check if sitemap exists
  if (!sitemapName || (!(sitemapName in sitemaps) && !(baseSitemapName in sitemaps) && !isAutoChunking)) {
    return createError({
      statusCode: 404,
      message: `Sitemap "${sitemapName}" not found.`,
    })
  }

  let sitemapConfig
  if (isAutoChunking) {
    // Auto-chunked sitemap
    sitemapConfig = {
      ...sitemaps.chunks,
      sitemapName,
    }
  }
  else if (isNamedChunking) {
    // Chunked named sitemap
    const baseSitemap = sitemaps[baseSitemapName]
    const chunkSize = typeof baseSitemap.chunks === 'number'
      ? baseSitemap.chunks
      : (baseSitemap.chunkSize || runtimeConfig.defaultSitemapsChunkSize || 1000)

    // Early validation of chunk index
    if (chunkIndex !== undefined && baseSitemap._chunkCount !== undefined) {
      if (chunkIndex >= baseSitemap._chunkCount) {
        return createError({
          statusCode: 404,
          message: `Chunk ${chunkIndex} does not exist for sitemap "${baseSitemapName}".`,
        })
      }
    }

    sitemapConfig = {
      ...baseSitemap,
      sitemapName, // Use the full name with chunk index
      _isChunking: true,
      _chunkSize: chunkSize,
    }
  }
  else {
    // Regular sitemap
    sitemapConfig = sitemaps[sitemapName]
  }

  return createSitemap(e, sitemapConfig, runtimeConfig)
})
