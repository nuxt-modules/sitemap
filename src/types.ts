import type { CreateFilterOptions } from './runtime/util/urlFilter'
import type { ModuleOptions } from './module'

export type MaybeFunction<T> = T | (() => T)
export type MaybePromise<T> = T | Promise<T>

export type SitemapEntry = SitemapFullEntry | string

export interface SitemapIndexEntry { sitemap: string; lastmod?: Date | string }
export interface SitemapItemDefaults extends Omit<Partial<SitemapFullEntry>, 'loc'> {
}

export type ResolvedSitemapEntry = Omit<SitemapFullEntry, 'url'> & Required<Pick<SitemapFullEntry, 'loc'>>

export type SitemapRoot = CreateFilterOptions & { defaults: SitemapItemDefaults; urls: MaybeFunction<MaybePromise<SitemapEntry[]>> }

export interface NuxtSimpleSitemapRuntime extends ModuleOptions {
  hasApiRoutesUrl: boolean
  urls: SitemapEntry[]
  pagesDirs: string[]
  extensions: string[]
}

export interface SitemapRenderCtx {
  sitemapName: string
  urls: ResolvedSitemapEntry[]
}

export type Changefreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'

export interface SitemapFullEntry {
  /**
   * @deprecated use `loc`
   */
  url?: string
  loc?: string
  lastmod?: string | Date
  changefreq?: Changefreq
  priority?: 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1
  news?: GoogleNewsEntry
  images?: Array<ImageEntry>
  videos?: Array<VideoEntry>
}

export interface GoogleNewsEntry {
  title: string
  date: Date | string
  publicationName: string
  publicationLanguage: string
}

export interface ImageEntry {
  loc: string | URL
  caption?: string
  geoLocation?: string
  title?: string
  license?: string | URL
}

export interface VideoEntry {
  title: string
  thumbnailLoc: string | URL
  description: string
  contentLoc?: string | URL
  playerLoc?: string | URL
  duration?: number
  expirationDate?: Date | string
  rating?: number
  viewCount?: number
  publicationDate?: Date | string
  familyFriendly?: boolean
  restriction?: Restriction
  platform?: Restriction
  requiresSubscription?: boolean
  uploader?: {
    name: string
    info?: string | URL
  }
  live?: boolean
  tag?: string
}

export interface Restriction {
  relationship: 'allow' | 'deny'
  content: string
}
