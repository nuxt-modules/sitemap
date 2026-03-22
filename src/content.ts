import type { Collection, PageCollectionItemBase } from '@nuxt/content'
import type { TypeOf } from 'zod'
import { z } from 'zod'

declare global {
  // eslint-disable-next-line vars-on-top
  var __sitemapCollectionFilters: Map<string, (entry: any) => boolean> | undefined
  // eslint-disable-next-line vars-on-top
  var __sitemapCollectionOnUrlFns: Map<string, (url: any, entry: any, collection: string) => void> | undefined
}

if (!globalThis.__sitemapCollectionFilters)
  globalThis.__sitemapCollectionFilters = new Map()
if (!globalThis.__sitemapCollectionOnUrlFns)
  globalThis.__sitemapCollectionOnUrlFns = new Map()

const collectionFilters = globalThis.__sitemapCollectionFilters
const collectionOnUrlFns = globalThis.__sitemapCollectionOnUrlFns

function buildSitemapObjectSchema(_z: typeof z) {
  return _z.object({
    loc: _z.string().optional(),
    lastmod: _z.date().optional(),
    changefreq: _z.union([_z.literal('always'), _z.literal('hourly'), _z.literal('daily'), _z.literal('weekly'), _z.literal('monthly'), _z.literal('yearly'), _z.literal('never')]).optional(),
    priority: _z.number().optional(),
    images: _z.array(_z.object({
      loc: _z.string(),
      caption: _z.string().optional(),
      geo_location: _z.string().optional(),
      title: _z.string().optional(),
      license: _z.string().optional(),
    })).optional(),
    videos: _z.array(_z.object({
      content_loc: _z.string(),
      player_loc: _z.string().optional(),
      duration: _z.string().optional(),
      expiration_date: _z.date().optional(),
      rating: _z.number().optional(),
      view_count: _z.number().optional(),
      publication_date: _z.date().optional(),
      family_friendly: _z.boolean().optional(),
      tag: _z.string().optional(),
      category: _z.string().optional(),
      restriction: _z.object({
        relationship: _z.literal('allow').optional(),
        value: _z.string().optional(),
      }).optional(),
      gallery_loc: _z.string().optional(),
      price: _z.string().optional(),
      requires_subscription: _z.boolean().optional(),
      uploader: _z.string().optional(),
    })).optional(),
  }).optional()
}

const sitemapObjectSchema = buildSitemapObjectSchema(z)

function withEditorHidden<T extends z.ZodTypeAny>(s: T): T {
  // .editor() is patched onto ZodType by @nuxt/content at runtime
  if (typeof (s as any).editor === 'function')
    return (s as any).editor({ hidden: true })
  return s
}

export interface DefineSitemapSchemaOptions<TEntry = Record<string, unknown>> {
  /**
   * Pass the `z` instance from `@nuxt/content` to ensure `.editor({ hidden: true })` works
   * across Zod versions. When omitted, the bundled `z` is used (`.editor()` applied if available).
   * @example
   * import { z } from '@nuxt/content' // or 'zod'
   * defineSitemapSchema({ z })
   */
  z?: typeof z
  /**
   * Collection name. Must match the key in your collections object.
   * Required when using `filter` or `onUrl`.
   */
  name?: string
  /**
   * Runtime filter function to exclude entries from sitemap.
   * Receives the full content entry including all schema fields.
   * Requires `name` parameter to be set.
   * @example
   * defineSitemapSchema({ name: 'blog', filter: (entry) => !entry.draft })
   */
  filter?: (entry: PageCollectionItemBase & SitemapSchema & TEntry) => boolean
  /**
   * Transform the sitemap URL entry for each item in this collection.
   * Mutate `url` directly to change `loc`, `lastmod`, `priority`, etc.
   * Requires `name` parameter to be set.
   * @example
   * defineSitemapSchema({ name: 'content_zh', onUrl: (url) => { url.loc = `/zh${url.loc}` } })
   */
  onUrl?: (
    url: { loc: string, lastmod?: string | Date, changefreq?: string, priority?: number, images?: { loc: string }[], videos?: { content_loc: string }[], [key: string]: unknown },
    entry: PageCollectionItemBase & SitemapSchema & TEntry,
    collection: string,
  ) => void
}

/**
 * Define the sitemap schema field for a Nuxt Content collection.
 *
 * @example
 * // Basic usage
 * defineCollection({
 *   type: 'page',
 *   source: '**',
 *   schema: z.object({
 *     sitemap: defineSitemapSchema()
 *   })
 * })
 *
 * @example
 * // With filter and onUrl
 * defineCollection({
 *   type: 'page',
 *   source: 'blog/**',
 *   schema: z.object({
 *     draft: z.boolean().optional(),
 *     sitemap: defineSitemapSchema({
 *       name: 'blog',
 *       filter: (entry) => !entry.draft,
 *       onUrl: (url) => { url.priority = 0.8 }
 *     })
 *   })
 * })
 */
export function defineSitemapSchema<T = Record<string, unknown>>(options?: DefineSitemapSchemaOptions<T>) {
  if (options?.filter || options?.onUrl) {
    if (!options.name)
      throw new Error('[sitemap] `name` is required when using `filter` or `onUrl` in defineSitemapSchema()')
    if (options.filter)
      collectionFilters.set(options.name, options.filter)
    if (options.onUrl)
      collectionOnUrlFns.set(options.name, options.onUrl)
  }
  const s = options?.z ? buildSitemapObjectSchema(options.z) : sitemapObjectSchema
  return withEditorHidden(s)
}

// Legacy schema export (wraps entire collection)
export const schema = z.object({
  sitemap: withEditorHidden(sitemapObjectSchema),
})

export type SitemapSchema = TypeOf<typeof schema>

/** @deprecated Use `defineSitemapSchema()` in your collection schema instead. `asSitemapCollection()` encourages a separate overlapping collection which breaks Nuxt Content HMR. */
export interface AsSitemapCollectionOptions<TEntry = Record<string, unknown>> {
  name?: string
  filter?: (entry: PageCollectionItemBase & SitemapSchema & TEntry) => boolean
  onUrl?: (
    url: { loc: string, lastmod?: string | Date, changefreq?: string, priority?: number, images?: { loc: string }[], videos?: { content_loc: string }[], [key: string]: unknown },
    entry: PageCollectionItemBase & SitemapSchema & TEntry,
    collection: string,
  ) => void
}

/** @deprecated Use `defineSitemapSchema()` in your collection schema instead. `asSitemapCollection()` encourages a separate overlapping collection which breaks Nuxt Content HMR. */
export function asSitemapCollection<T>(collection: Collection<T>, options?: AsSitemapCollectionOptions<T>): Collection<T> {
  if (collection.type === 'page') {
    // @ts-expect-error untyped
    collection.schema = collection.schema ? schema.extend(collection.schema.shape) : schema

    if (options?.filter || options?.onUrl) {
      if (!options.name)
        throw new Error('[sitemap] `name` is required when using `filter` or `onUrl` in asSitemapCollection()')
      if (options.filter)
        collectionFilters.set(options.name, options.filter)
      if (options.onUrl)
        collectionOnUrlFns.set(options.name, options.onUrl)
    }
  }

  return collection
}
