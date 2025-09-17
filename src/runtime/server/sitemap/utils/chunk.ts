import type { ModuleRuntimeConfig, SitemapDefinition } from '../../../types'

export interface ChunkInfo {
  isChunked: boolean
  baseSitemapName: string
  chunkIndex?: number
  chunkSize: number
}

export function parseChunkInfo(
  sitemapName: string,
  sitemaps: ModuleRuntimeConfig['sitemaps'],
  defaultChunkSize?: number | false,
): ChunkInfo {
  defaultChunkSize = defaultChunkSize || 1000
  // Check if this is an auto-chunked sitemap (numeric name)
  if (typeof sitemaps.chunks !== 'undefined' && !Number.isNaN(Number(sitemapName))) {
    return {
      isChunked: true,
      baseSitemapName: 'sitemap',
      chunkIndex: Number(sitemapName),
      chunkSize: defaultChunkSize,
    }
  }

  // Check if this is a chunked named sitemap (format: name-number)
  if (sitemapName.includes('-')) {
    const parts = sitemapName.split('-')
    const lastPart = parts.pop()

    if (!Number.isNaN(Number(lastPart))) {
      const baseSitemapName = parts.join('-')
      const baseSitemap = sitemaps[baseSitemapName]

      if (baseSitemap && (baseSitemap.chunks || baseSitemap._isChunking)) {
        const chunkSize = typeof baseSitemap.chunks === 'number'
          ? baseSitemap.chunks
          : (baseSitemap.chunkSize || defaultChunkSize)

        return {
          isChunked: true,
          baseSitemapName,
          chunkIndex: Number(lastPart),
          chunkSize,
        }
      }
    }
  }

  // Not a chunked sitemap
  return {
    isChunked: false,
    baseSitemapName: sitemapName,
    chunkIndex: undefined,
    chunkSize: defaultChunkSize,
  }
}

export function getSitemapConfig(
  sitemapName: string,
  sitemaps: ModuleRuntimeConfig['sitemaps'],
  defaultChunkSize: number = 1000,
): SitemapDefinition {
  const chunkInfo = parseChunkInfo(sitemapName, sitemaps, defaultChunkSize)

  if (chunkInfo.isChunked) {
    // For auto-chunked sitemaps
    if (chunkInfo.baseSitemapName === 'sitemap' && typeof sitemaps.chunks !== 'undefined') {
      return {
        ...sitemaps.chunks,
        sitemapName,
        _isChunking: true,
        _chunkSize: chunkInfo.chunkSize,
      }
    }

    // For named chunked sitemaps
    const baseSitemap = sitemaps[chunkInfo.baseSitemapName]
    if (baseSitemap) {
      return {
        ...baseSitemap,
        sitemapName, // Use the full name with chunk index
        _isChunking: true,
        _chunkSize: chunkInfo.chunkSize,
      }
    }
  }

  // Regular sitemap
  return sitemaps[sitemapName]
}

export function sliceUrlsForChunk<T>(
  urls: T[],
  sitemapName: string,
  sitemaps: ModuleRuntimeConfig['sitemaps'],
  defaultChunkSize: number = 1000,
): T[] {
  const chunkInfo = parseChunkInfo(sitemapName, sitemaps, defaultChunkSize)

  if (chunkInfo.isChunked && chunkInfo.chunkIndex !== undefined) {
    const startIndex = chunkInfo.chunkIndex * chunkInfo.chunkSize
    const endIndex = (chunkInfo.chunkIndex + 1) * chunkInfo.chunkSize
    return urls.slice(startIndex, endIndex)
  }

  return urls
}
