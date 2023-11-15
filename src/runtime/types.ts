import type { FetchOptions } from 'ofetch'
import type { H3Event } from 'h3'
import type { ModuleOptions } from '../module'

export interface IndexSitemapRemotes {
  index?: (string | SitemapIndexEntry)[]
}

export interface MultiSitemapEntry {
  [key: string]: Partial<SitemapDefinition>
}

export type MultiSitemapsInput = Partial<MultiSitemapEntry & IndexSitemapRemotes>

export type MaybeFunction<T> = T | (() => T)
export type MaybePromise<T> = T | Promise<T>

export type SitemapUrlInput = SitemapUrl | string

export interface SitemapSourceBase {
  context: {
    name: string
    description?: string
    tips?: string[]
  }
  fetch?: string | [string, FetchOptions]
  urls?: SitemapUrlInput[]
  sourceType?: 'app' | 'user'
}
export interface SitemapSourceResolved extends Omit<SitemapSourceBase, 'urls'> {
  urls: SitemapUrlInput[]
  error?: any
  timeTakenMs?: number
}

export type AppSourceContext = 'nuxt:pages' | 'nuxt:prerender' | 'nuxt:route-rules' | '@nuxtjs/i18n:pages' | '@nuxt/content:document-driven'

export type SitemapSourceInput = string | SitemapSourceBase | SitemapSourceResolved

export type NormalisedLocales = { code: string; iso?: string; domain?: string }[]
export interface AutoI18nConfig {
  differentDomains?: boolean
  locales: NormalisedLocales
  defaultLocale: string
  strategy: 'prefix' | 'prefix_except_default' | 'prefix_and_default' | 'no_prefix'
}

export interface ModuleRuntimeConfig extends Pick<ModuleOptions, 'sitemapName' | 'excludeAppSources' | 'sortEntries' | 'defaultSitemapsChunkSize' | 'xslColumns' | 'xslTips' | 'debug' | 'discoverImages' | 'autoLastmod' | 'xsl' | 'credits' > {
  version: string
  isNuxtContentDocumentDriven: boolean
  sitemaps: { index?: Pick<SitemapDefinition, 'sitemapName' | '_route'> & { sitemaps: SitemapIndexEntry[] } } & Record<string, Omit<SitemapDefinition, 'urls' | 'sources'> & { _hasSourceChunk?: boolean }>
  autoI18n?: AutoI18nConfig
  isMultiSitemap: boolean
  isI18nMapped: boolean
}

export interface SitemapIndexEntry {
  sitemap: string
  lastmod?: string
}

export type ResolvedSitemapUrl = Omit<SitemapUrl, 'url'> & Required<Pick<SitemapUrl, 'loc'>>

export interface SitemapDefinition {
  /**
   * A collection include patterns for filtering which URLs end up in the sitemap.
   */
  include?: (string | RegExp)[]
  /**
   * A collection exclude patterns for filtering which URLs end up in the sitemap.
   */
  exclude?: (string | RegExp)[]
  /**
   * Should the sitemap be generated using global sources.
   *
   * This is enabled by default when using a single sitemap. Otherwise, it will be opt-in.
   */
  includeAppSources?: boolean
  /**
   * The root sitemap name.
   * Only works when multiple sitemaps option `sitemaps` isn't used.
   *
   * @default `sitemap.xml`
   */
  sitemapName: string
  /**
   * A resolvable collection of URLs to include in the sitemap.
   *
   * Will be resolved when the sitemap is generated.
   */
  urls?: MaybeFunction<MaybePromise<SitemapUrlInput[]>>
  /**
   * Default options for all URLs in the sitemap.
   */
  defaults?: Omit<SitemapUrl, 'loc'>
  /**
   * Additional sources of URLs to include in the sitemap.
   */
  sources?: SitemapSourceInput[]
  /**
   * The endpoint to fetch dynamic URLs from.
   *
   * @deprecated use `sources`
   */
  dynamicUrlsApiEndpoint?: string | false
  /**
   * @internal
   */
  _route?: string
}

export interface SitemapRenderCtx {
  sitemapName: string
  urls: ResolvedSitemapUrl[]
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

export interface SitemapUrl {
  loc: string
  lastmod?: string | Date
  changefreq?: Changefreq
  priority?: 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1
  alternatives?: Array<AlternativeEntry>
  news?: GoogleNewsEntry
  images?: Array<ImageEntry>
  videos?: Array<VideoEntry>
  _i18nTransform?: boolean
  _sitemap?: string
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
  thumbnail_loc: string | URL
  description: string
  content_loc?: string | URL
  player_loc?: string | URL
  duration?: number
  expiration_date?: Date | string
  rating?: number
  view_count?: number
  publication_date?: Date | string
  family_friendly?: 'yes' | 'no' | boolean
  restriction?: Restriction
  platform?: Platform
  price?: ({
    price?: number | string
    currency?: string
    type?: 'rent' | 'purchase' | 'package' | 'subscription'
  })[]
  requires_subscription?: 'yes' | 'no' | boolean
  uploader?: {
    uploader: string
    info?: string | URL
  }
  live?: 'yes' | 'no' | boolean
  tag?: string | string[]
}

export interface Restriction {
  relationship: 'allow' | 'deny'
  restriction: string
}
export interface Platform {
  relationship: 'allow' | 'deny'
  platform: string
}

export interface NitroUrlResolvers {
  event: H3Event
  canonicalUrlResolver: (path: string) => string
  relativeBaseUrlResolver: (path: string) => string
}
