import type { FetchOptions } from 'ofetch'
import type { H3Event } from 'h3'
import type { ParsedURL } from 'ufo'
import type { NuxtI18nOptions } from '@nuxtjs/i18n'

// we need to have the module options within the runtime entry
// as we don't want to depend on the module entry as it can cause
// weird nitro issues
export interface ModuleOptions extends SitemapDefinition {
  /**
   * Whether the sitemap.xml should be generated.
   *
   * @default true
   */
  enabled: boolean
  /**
   * Enables debug logs and a debug endpoint.
   *
   * @default false
   */
  debug: boolean
  /**
   * Minify the sitemap xml
   *
   * @default false
   */
  minify: boolean
  /**
   * Should lastmod be automatically added to the sitemap.
   *
   * Warning: This may not be following best practices for sitemaps.
   *
   * @see https://nuxtseo.com/sitemap/guides/best-practices.
   * @default false
   */
  autoLastmod: boolean
  /**
   * Sources to exclude from the sitemap.
   */
  excludeAppSources: true | (AppSourceContext[])
  /**
   * Multiple sitemap support for large sites.
   *
   * @default false
   */
  sitemaps?: boolean | MultiSitemapsInput
  /**
   * The path prefix for the sitemaps.
   *
   * @default /__sitemap__/
   */
  sitemapsPathPrefix: string | false
  /**
   * Sitemaps to append to the sitemap index.
   *
   * This will only do anything when using multiple sitemaps.
   */
  appendSitemaps?: (string | SitemapIndexEntry)[]
  /**
   * Path to the xsl that styles sitemap.xml.
   *
   * Set to `false` to disable styling.
   *
   * @default /__sitemap__/style.xsl
   */
  xsl: string | false
  /**
   * Toggle the tips displayed in the xsl.
   *
   * @default true
   */
  xslTips: boolean
  /**
   * Customised the columns displayed in the xsl.
   *
   * @default [{ label: 'URL', width: '50%', select: 'string' }, { label: 'Last Modified', width: '25%', select: 'lastmod' }, { label: 'Change Frequency', width: '25%', select: 'changefreq' }]
   */
  xslColumns?: { label: string, width: `${string}%`, select?: string }[]
  /**
   * When prerendering, should images be automatically be discovered and added to the sitemap.
   *
   * @default true
   */
  discoverImages: boolean
  /**
   * When prerendering, should videos be automatically be discovered and added to the sitemap.
   *
   * @default true
   */
  discoverVideos: boolean
  /**
   * When chunking the sitemaps into multiple files, how many entries should each file contain.
   *
   * Set to `false` to disabling chunking completely.
   *
   * @default 1000
   */
  defaultSitemapsChunkSize: number | false
  /**
   * Modify the cache behavior.
   *
   * Passing a boolean will enable or disable the runtime cache with the default options.
   *
   * Providing a record will allow you to configure the runtime cache fully.
   *
   * @default true
   * @see https://nitro.unjs.io/guide/storage#mountpoints
   * @example { driver: 'redis', host: 'localhost', port: 6379, password: 'password' }
   */
  runtimeCacheStorage: boolean | (Record<string, any> & {
    driver: string
  })
  /**
   * Automatically add alternative links to the sitemap based on a prefix list.
   * Is used by @nuxtjs/i18n to automatically add alternative links to the sitemap.
   */
  autoI18n?: boolean | AutoI18nConfig
  /**
   * Enable when your nuxt/content files match your pages. This will automatically add sitemap content to the sitemap.
   *
   * This is similar behavior to using `nuxt/content` with `documentDriven: true`.
   */
  strictNuxtContentPaths: boolean
  /**
   * Should the sitemap.xml display credits for the module.
   *
   * @default true
   */
  credits: boolean
  /**
   * How long, in seconds, should the sitemap be cached for.
   *
   * @default 600
   */
  cacheMaxAgeSeconds: number | false
  /**
   * Should the entries be sorted by loc.
   *
   * @default true
   */
  sortEntries: boolean
  /**
   * Warm up the sitemap route(s) cache when Nitro starts.
   *
   * May be implemented by default in a future minor version.
   *
   * @experimental Will be enabled by default in v5 (if stable)
   */
  experimentalWarmUp?: boolean
  /**
   * Send the Sitemap as a compressed stream supporting gzip, brolti, etc.
   *
   * @experimental Will be enabled by default in v5 (if stable)
   */
  experimentalCompression?: boolean
  /**
   * When enabled, sitemap generation only runs during prerendering.
   * The sitemap building code is tree-shaken from the runtime bundle.
   *
   * Requires sitemaps to be prerendered (e.g., `nuxt generate` or `nitro.prerender.routes` includes sitemap).
   *
   * @default false
   */
  zeroRuntime?: boolean
}

export interface IndexSitemapRemotes {
  index?: (string | SitemapIndexEntry)[]
}

export interface MultiSitemapEntry {
  [key: string]: Partial<SitemapDefinition>
}

export type MultiSitemapsInput = Partial<MultiSitemapEntry> & Partial<IndexSitemapRemotes>

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
  _isFailure?: boolean
}

export type AppSourceContext = 'nuxt:pages' | 'nuxt:prerender' | 'nuxt:route-rules' | '@nuxtjs/i18n:pages' | '@nuxt/content:document-driven'

export type SitemapSourceInput = string | [string, FetchOptions] | SitemapSourceBase | SitemapSourceResolved

// copied from @nuxtjs/i18n, types do not appear to be working
interface LocaleObject extends Record<string, any> {
  code: string
  name?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  domain?: string
  domains?: string[]
  defaultForDomains?: string[]
  file?: string | {
    path: string
    cache?: boolean
  }
  files?: string[] | {
    path: string
    cache?: boolean
  }[]
  isCatchallLocale?: boolean
  /**
   * @deprecated in v9, use `language` instead
   */
  iso?: string
  language?: string
}

export interface AutoI18nConfig {
  differentDomains?: boolean
  locales: (LocaleObject & { _sitemap: string, _hreflang: string })[]
  defaultLocale: string
  strategy: 'prefix' | 'prefix_except_default' | 'prefix_and_default' | 'no_prefix'
  pages?: Record<string, Record<string, string | false>>
}

export interface ModuleRuntimeConfig extends Pick<ModuleOptions, 'sitemapsPathPrefix' | 'cacheMaxAgeSeconds' | 'sitemapName' | 'excludeAppSources' | 'sortEntries' | 'defaultSitemapsChunkSize' | 'xslColumns' | 'xslTips' | 'debug' | 'discoverImages' | 'discoverVideos' | 'autoLastmod' | 'xsl' | 'credits' | 'minify'> {
  version: string
  isNuxtContentDocumentDriven: boolean
  sitemaps: { index?: Pick<SitemapDefinition, 'sitemapName' | '_route'> & { sitemaps: SitemapIndexEntry[] } } & Record<string, Omit<SitemapDefinition, 'urls'> & { _hasSourceChunk?: boolean }>
  autoI18n?: AutoI18nConfig
  isMultiSitemap: boolean
  isI18nMapped: boolean
}

export interface SitemapIndexEntry {
  sitemap: string
  lastmod?: string
  /**
   * @internal
   */
  _sitemapName?: string
}

export type FilterInput = (string | RegExp | {
  regex: string
})
export type ResolvedSitemapUrl = Omit<SitemapUrl, 'url'> & Required<Pick<SitemapUrl, 'loc'>> & {
  /**
   * @internal
   */
  _key: string
  /**
   * @internal
   */
  _path: ParsedURL | null
  /**
   * @internal
   */
  _relativeLoc: string
  /**
   * @internal
   */
  _abs: boolean
}

export interface SitemapDefinition {
  /**
   * A collection include patterns for filtering which URLs end up in the sitemap.
   */
  include?: FilterInput[]
  /**
   * A collection exclude patterns for filtering which URLs end up in the sitemap.
   */
  exclude?: FilterInput[]
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
   * Whether to enable chunking for this sitemap.
   *
   * - `true`: Enable with default chunk size from `defaultSitemapsChunkSize`
   * - `number`: Enable with specific chunk size (must be > 0)
   * - `false` or `undefined`: Disable chunking
   *
   * Note: Chunking only applies to sitemaps with sources. URLs provided directly
   * are not chunked.
   *
   * @default false
   * @example true
   * @example 5000
   */
  chunks?: boolean | number
  /**
   * The maximum number of URLs per chunk when chunking is enabled.
   * Takes precedence over the `chunks` property when both are specified.
   * Also overrides the global `defaultSitemapsChunkSize`.
   *
   * Must be a positive integer.
   *
   * @default 1000
   * @example 500
   * @example 10000
   */
  chunkSize?: number
  /**
   * @internal
   */
  _route?: string
  /**
   * @internal
   */
  _isChunking?: boolean
  /**
   * @internal
   */
  _chunkSize?: number
  /**
   * @internal
   */
  _chunkCount?: number
}

interface NitroBaseHook {
  event: H3Event
}

export interface SitemapIndexRenderCtx extends NitroBaseHook {
  sitemaps: SitemapIndexEntry[]
}

export interface SitemapRenderCtx extends NitroBaseHook {
  sitemapName: string
  urls: ResolvedSitemapUrl[]
}

export interface SitemapInputCtx extends NitroBaseHook {
  sitemapName: string
  urls: SitemapUrlInput[]
}

export interface SitemapOutputHookCtx extends NitroBaseHook {
  sitemapName: string
  sitemap: string
}

export interface SitemapSourcesHookCtx extends NitroBaseHook {
  sitemapName: string
  sources: (SitemapSourceBase | SitemapSourceResolved)[]
}

export type Changefreq
  = | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'

export interface SitemapUrl {
  loc: string
  /**
   * Alias for `loc`. Will be normalized to `loc`.
   */
  url?: string
  lastmod?: string | Date
  changefreq?: Changefreq
  priority?: 0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1
  alternatives?: Array<AlternativeEntry>
  news?: GoogleNewsEntry
  images?: Array<ImageEntry>
  videos?: Array<VideoEntry>
  _i18nTransform?: boolean
  _sitemap?: string | false
}

export type SitemapStrict = Required<SitemapUrl>

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
  geo_location?: string
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
  category?: string
  gallery_loc?: string | URL
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
  fixSlashes: (path: string) => string
}

interface NuxtI18nMicro {
  includeDefaultLocaleRoute?: boolean
}

export type I18nIntegrationOptions = NuxtI18nOptions & NuxtI18nMicro
