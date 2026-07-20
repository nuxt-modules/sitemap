import type {
  ResolvedSitemapUrl,
  SitemapUrlInput,
} from '../../../types'

const naturalCompare = new Intl.Collator(undefined, { numeric: true }).compare

function countPathSegments(loc: string): number {
  let segments = 1
  for (let i = 0; i < loc.length; i++) {
    if (loc.charCodeAt(i) === 47)
      segments++
  }
  return segments
}

export function sortInPlace<T extends SitemapUrlInput[] | ResolvedSitemapUrl[]>(urls: T): T {
  // In-place sort to avoid creating new arrays
  urls.sort((a, b) => {
    const aLoc = typeof a === 'string' ? a : a.loc
    const bLoc = typeof b === 'string' ? b : b.loc

    // First sort by path segments
    const aSegments = countPathSegments(aLoc)
    const bSegments = countPathSegments(bLoc)
    if (aSegments !== bSegments) {
      return aSegments - bSegments
    }

    // Then sort by locale compare with numeric
    return naturalCompare(aLoc, bLoc)
  })

  return urls
}
