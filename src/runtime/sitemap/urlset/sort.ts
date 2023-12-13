import type {
  ResolvedSitemapUrl,
  SitemapUrlInput,
} from '../../types'

export function sortSitemapUrls<T extends SitemapUrlInput[] | ResolvedSitemapUrl[]>(urls: T): T {
  // sort based on logical string sorting of the loc, we need to properly account for numbers here
  // so that urls: /route/1, /route/2 is displayed instead of /route/1, /route/10
  return urls
    .sort(
      (a, b) => {
        const aLoc = typeof a === 'string' ? a : a.loc
        const bLoc = typeof b === 'string' ? b : b.loc
        return aLoc.localeCompare(bLoc, undefined, { numeric: true })
      },
    )
    .sort((a, b) => {
      const aLoc = (typeof a === 'string' ? a : a.loc) || ''
      const bLoc = (typeof b === 'string' ? b : b.loc) || ''
      // we need to sort based on the path segments as well
      const aSegments = aLoc.split('/').length
      const bSegments = bLoc.split('/').length
      if (aSegments > bSegments)
        return 1
      if (aSegments < bSegments)
        return -1
      return 0
    }) as T
}
