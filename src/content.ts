import type { Collection, PageCollectionItemBase } from '@nuxt/content'
import type { TypeOf } from 'zod'
import { createContentSchemaFactory } from 'nuxtseo-shared/content'
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

export interface DefineSitemapSchemaOptions<TEntry = Record<string, unknown>> {
  z?: typeof z
  name?: string
  filter?: (entry: PageCollectionItemBase & SitemapSchema & TEntry) => boolean
  onUrl?: (
    url: { loc: string, lastmod?: string | Date, changefreq?: string, priority?: number, images?: { loc: string }[], videos?: { content_loc: string }[], [key: string]: unknown },
    entry: PageCollectionItemBase & SitemapSchema & TEntry,
    collection: string,
  ) => void
}

const { defineSchema, asCollection, schema } = createContentSchemaFactory({
  fieldName: 'sitemap',
  label: 'sitemap',
  docsUrl: 'https://nuxtseo.com/sitemap/guides/content',
  buildSchema: _z => buildSitemapObjectSchema(_z),
  onDefineSchema: (options: DefineSitemapSchemaOptions) => {
    if ('type' in options || 'source' in options)
      throw new Error('[sitemap] `defineSitemapSchema()` returns a schema field, not a collection wrapper. Use it inside your schema: `schema: z.object({ sitemap: defineSitemapSchema() })`. See https://nuxtseo.com/sitemap/guides/content')
    warnIfZodMismatch(options?.z)
    if (options?.filter || options?.onUrl) {
      if (!options.name)
        throw new Error('[sitemap] `name` is required when using `filter` or `onUrl` in defineSitemapSchema()')
      if (options.filter)
        collectionFilters.set(options.name, options.filter)
      if (options.onUrl)
        collectionOnUrlFns.set(options.name, options.onUrl)
    }
  },
}, z)

export { defineSchema as defineSitemapSchema, schema }

export type SitemapSchema = TypeOf<typeof schema>

/** @deprecated Use `defineSitemapSchema()` in your collection schema instead. See https://nuxtseo.com/sitemap/guides/content */
export function asSitemapCollection<T>(collection: Collection<T>, options?: DefineSitemapSchemaOptions<T>): Collection<T> {
  if (options?.filter || options?.onUrl) {
    if (!options.name)
      throw new Error('[sitemap] `name` is required when using `filter` or `onUrl` in asSitemapCollection()')
    if (options.filter)
      collectionFilters.set(options.name, options.filter)
    if (options.onUrl)
      collectionOnUrlFns.set(options.name, options.onUrl)
  }
  try {
    return asCollection(collection) as Collection<T>
  }
  catch (e) {
    console.warn(
      `[sitemap] Failed to apply sitemap schema to collection. This is likely a Zod version mismatch.`,
      `Pass your Zod instance explicitly: \`defineSitemapSchema({ z })\`. See https://nuxtseo.com/sitemap/guides/content`,
      `Error: ${(e as Error).message}`,
    )
    return collection
  }
}

let _hasWarnedZodMismatch = false
function warnIfZodMismatch(userZ?: typeof z) {
  if (_hasWarnedZodMismatch || userZ)
    return
  // Detect mixed zod versions: zod 3 uses `_def` without `def`, zod 4 has both
  const testSchema = z.object({}) as any
  const hasV3 = '_def' in testSchema && !('def' in testSchema)
  const hasV4 = 'def' in testSchema
  // If both zod 3 and zod 4 are installed, `import { z } from 'zod'` may resolve
  // to a different version than what @nuxt/content uses internally
  if (hasV3 || hasV4) {
    // Only warn if we can detect the version (always true), but the user hasn't passed z
    // The real check: does our z produce schemas compatible with @nuxt/content's detectSchemaVendor?
    // We can't know for sure without importing content, so just warn if zod 3 is resolved
    // since @nuxt/content v3.12+ expects zod 4
    if (hasV3) {
      _hasWarnedZodMismatch = true
      console.warn(
        `[sitemap] Zod 3 detected but @nuxt/content v3 expects Zod 4.`,
        `Pass your zod instance explicitly: \`defineSitemapSchema({ z })\`.`,
        `See https://nuxtseo.com/sitemap/guides/content`,
      )
    }
  }
}

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
