import type {
  ResolvedSitemapUrl,
  SitemapUrlInput,
} from '../../../types'

export function sortInPlace<T extends SitemapUrlInput[] | ResolvedSitemapUrl[]>(urls: T): T {
  // In-place sort to avoid creating new arrays
  urls.sort((a, b) => {
    const aLoc = typeof a === 'string' ? a : a.loc
    const bLoc = typeof b === 'string' ? b : b.loc

    // First sort by path segments
    const aSegments = aLoc.split('/').length
    const bSegments = bLoc.split('/').length
    if (aSegments !== bSegments) {
      return aSegments - bSegments
    }

    // Then sort by locale compare with numeric
    return aLoc.localeCompare(bLoc, undefined, { numeric: true })
  })

  return urls
}
