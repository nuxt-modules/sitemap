import type {
  ResolvedSitemapUrl,
  SitemapUrlInput,
} from '../../../types'

let naturalCompare: Intl.Collator['compare'] | undefined

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

    // Defer locale setup until a sitemap needs a numeric comparison.
    return (naturalCompare ??= new Intl.Collator(undefined, { numeric: true }).compare)(aLoc, bLoc)
  })

  return urls
}
