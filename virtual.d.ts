declare module '#sitemap-virtual/read-sources.mjs' {
  export function readSourcesFromFilesystem(filename: string): Promise<any | null>
}

declare module '#sitemap-virtual/global-sources.mjs' {
  import type { SitemapSourceBase, SitemapSourceResolved } from '#sitemap/types'

  export const sources: (SitemapSourceBase | SitemapSourceResolved)[]
}

declare module '#sitemap-virtual/child-sources.mjs' {
  import type { SitemapSourceBase, SitemapSourceResolved } from '#sitemap/types'

  export const sources: Record<string, (SitemapSourceBase | SitemapSourceResolved)[]>
}
