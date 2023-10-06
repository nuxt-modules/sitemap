import type { ModuleOptions } from '../module'
import type { CreateFilterOptions } from './util/urlFilter'

export interface IndexSitemapRemotes {
  index?: (string | SitemapIndexEntry)[]
}

export interface IndexSitemapLocals {
  [key: string]: Partial<SitemapRoot>
}

export type MultiSitemapsInput = Partial<IndexSitemapLocals & IndexSitemapRemotes>

export type MaybeFunction<T> = T | (() => T)
export type MaybePromise<T> = T | Promise<T>

export type SitemapEntryInput = SitemapEntry | string

export interface DataSourceResult {
  context: 'pages' | 'nuxt-config.module' | 'nuxt-config.nitro-prerender' | 'nuxt-config.route-rules' | 'api' | 'prerender'
  urls: SitemapEntryInput[]
  path?: string
  error?: Error | string
  timeTakenMs?: number
}

export type NormalisedLocales = { code: string; iso?: string }[]
export interface AutoI18nConfig { locales: NormalisedLocales; defaultLocale: string; strategy: 'prefix' | 'prefix_except_default' | 'prefix_and_default' }

export type RuntimeModuleOptions = { urls: SitemapEntryInput[]; autoI18n?: AutoI18nConfig; isI18nMap?: boolean } & Pick<ModuleOptions,  'sortEntries' | 'defaultSitemapsChunkSize' | 'sitemapName' | 'cacheTtl' | 'runtimeCacheStorage' | 'xslColumns' | 'xslTips' | 'debug' | 'discoverImages' | 'autoLastmod' | 'xsl' | 'credits' | 'defaults' | 'include' | 'exclude' | 'sitemaps' | 'dynamicUrlsApiEndpoint'>

export interface ModuleRuntimeConfig { moduleConfig: RuntimeModuleOptions; buildTimeMeta: ModuleComputedOptions }

export interface SitemapIndexEntry {
  sitemap: string
  lastmod?: string
  /**
   * Internally used to decide if the entry needs to be generated. Useful for ignoring remote sitemaps.
   */
  referenceOnly?: boolean
}
export type SitemapItemDefaults = Omit<Partial<SitemapEntry>, 'loc'>

export type ResolvedSitemapEntry = Omit<SitemapEntry, 'url'> & Required<Pick<SitemapEntry, 'loc'>>

export interface SitemapRoot extends CreateFilterOptions {
  /**
   * The root sitemap name.
   * Only works when multiple sitemaps option `sitemaps` isn't used.
   *
   * @default `sitemap.xml`
   */
  sitemapName: string
  urls: MaybeFunction<MaybePromise<SitemapEntryInput[]>>
  defaults?: Omit<SitemapEntry, 'loc'>
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
  version: string
}

export interface SitemapRenderCtx {
  sitemapName: string
  urls: ResolvedSitemapEntry[]
}

export interface SitemapOutputHookCtx {
  sitemapName: string
  sitemap: string
}

export type Changefreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'

export interface SitemapEntry {
  loc: string
  lastmod?: string | Date
  changefreq?: Changefreq
  priority?: 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1
  alternatives?: Array<AlternativeEntry>
  news?: GoogleNewsEntry
  images?: Array<ImageEntry>
  videos?: Array<VideoEntry>
  /**
   * @deprecated use `loc`
   */
  url?: string
}

export interface AlternativeEntry {
  hreflang: string
  href: string | URL
}

export interface GoogleNewsEntry {
  /**
   * The title of the news article.
   * @example "Companies A, B in Merger Talks"
   */
  title: string
  /**
   * The article publication date in W3C format. Specify the original date and time when the article was first
   * published on your site. Don't specify the time when you added the article to your sitemap.
   * @example "2008-12-23"
   */
  publication_date: Date | string
  publication: {
    /**
     * The <news:name> tag is the name of the news publication.
     * It must exactly match the name as it appears on your articles on news.google.com, omitting anything in parentheses.
     * @example "The Example Times"
     */
    name: string
    /**
     * The <news:language> tag is the language of your publication. Use an ISO 639 language code (two or three letters).
     * @example en
     */
    language: string
  }
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
  relativeBaseUrlResolver: (path: string) => string
  callHook?: (ctx: SitemapRenderCtx) => Promise<void>
  extraRoutes: { routeRules: string[]; prerenderUrls: string[] }
  prerenderUrls?: SitemapEntryInput[]
  pages: SitemapEntryInput[]
}

export type BuildSitemapIndexInput = BuildSitemapInput
