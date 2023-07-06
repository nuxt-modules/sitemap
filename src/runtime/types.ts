import type { ModuleOptions } from '../module'
import type { CreateFilterOptions } from './util/urlFilter'

export interface IndexSitemapRemotes {
  index: (string | SitemapIndexEntry)[]
}

export interface IndexSitemapLocals {
  [key: string]: Partial<SitemapRoot>
}

export type MultiSitemapsInput = IndexSitemapLocals & IndexSitemapRemotes

export type MaybeFunction<T> = T | (() => T)
export type MaybePromise<T> = T | Promise<T>

export type SitemapEntry = SitemapFullEntry | string

export interface SitemapDataSource { context: string; urls: SitemapEntry[] }

export type RuntimeModuleOptions = { urls: SitemapEntry[] } & Pick<ModuleOptions, 'cacheTtl' | 'runtimeCacheStorage' | 'xslColumns' | 'xslTips' | 'debug' | 'discoverImages' | 'autoLastmod' | 'xsl' | 'autoAlternativeLangPrefixes' | 'credits' | 'defaults' | 'include' | 'exclude' | 'sitemaps' | 'dynamicUrlsApiEndpoint'>

export interface ModuleRuntimeConfig { moduleConfig: RuntimeModuleOptions; buildTimeMeta: ModuleComputedOptions }

export interface SitemapIndexEntry {
  sitemap: string
  lastmod?: string
  /**
   * Internally used to decide if the entry needs to be generated. Useful for ignoring remote sitemaps.
   */
  referenceOnly?: boolean
}
export interface SitemapItemDefaults extends Omit<Partial<SitemapFullEntry>, 'loc'> {
}

export type ResolvedSitemapEntry = Omit<SitemapFullEntry, 'url'> & Required<Pick<SitemapFullEntry, 'loc'>>

export interface SitemapRoot extends CreateFilterOptions {
  /**
   * The root sitemap name.
   * Only works when multiple sitemaps option `sitemaps` isn't used.
   *
   * @default `sitemap.xml`
   */
  sitemapName: string
  urls: MaybeFunction<MaybePromise<SitemapEntry[]>>
  defaults?: Omit<SitemapFullEntry, 'loc'>
  /**
   * The endpoint to fetch dynamic URLs from.
   */
  dynamicUrlsApiEndpoint: string
}

export interface ModuleComputedOptions {
  hasApiRoutesUrl: boolean
  isNuxtContentDocumentDriven: boolean
  hasPrerenderedRoutesPayload: boolean
  prerenderSitemap: boolean
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
  loc: string
  lastmod?: string | Date
  changefreq?: Changefreq
  priority?: 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1
  alternatives?: Array<AlternativeEntry>
  news?: GoogleNewsEntry
  images?: Array<ImageEntry>
  videos?: Array<VideoEntry>
}

export interface AlternativeEntry {
  hreflang: string
  href: string | URL
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

export interface BuildSitemapInput {
  /**
   * prerender: config
   * ssr: useRuntimeConfig()['nuxt-simple-sitemaps]
   */
  moduleConfig: ModuleRuntimeConfig['moduleConfig']
  buildTimeMeta: ModuleRuntimeConfig['buildTimeMeta']
  sitemap?: SitemapRoot
  getRouteRulesForPath: (path: string) => Record<string, any>
  canonicalUrlResolver: (path: string) => string
  nitroUrlResolver: (path: string) => string
  relativeBaseUrlResolver: (path: string) => string
  callHook?: (ctx: SitemapRenderCtx) => Promise<void>
  prerenderUrls?: SitemapEntry[]
  pages: SitemapEntry[]
}

export type BuildSitemapIndexInput = BuildSitemapInput
