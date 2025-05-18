import type {
  ResolvedSitemapUrl,
  SitemapUrlInput,
} from '../../../types'

export function sortSitemapUrls<T extends SitemapUrlInput[] | ResolvedSitemapUrl[]>(urls: T): T {
  // Pre-compute sort keys for better performance
  const items = urls.map((u, idx) => {
    const loc = typeof u === 'string' ? u : u.loc || ''
    const segments = loc.split('/')
    return {
      original: u,
      idx,
      loc,
      segmentCount: segments.length,
    }
  })

  // Single sort pass with combined comparisons
  items.sort((a, b) => {
    // First sort by segment count
    if (a.segmentCount !== b.segmentCount) {
      return a.segmentCount - b.segmentCount
    }
    // Then by locale compare with numeric handling
    return a.loc.localeCompare(b.loc, undefined, { numeric: true })
  })

  // Extract sorted results
  const result = Array.from({ length: urls.length })
  for (let i = 0; i < items.length; i++) {
    result[i] = items[i].original
  }
  return result as T
}
