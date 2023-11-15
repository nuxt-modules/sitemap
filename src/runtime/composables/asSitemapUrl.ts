import type { SitemapUrlInput } from '../types'

export function asSitemapUrl(url: SitemapUrlInput | Record<string, any>): SitemapUrlInput {
  return url as SitemapUrlInput
}
