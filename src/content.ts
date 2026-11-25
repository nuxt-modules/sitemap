import type { Collection } from '@nuxt/content'
import type { TypeOf } from 'zod'
import type { SitemapCollectionHooks } from './content-hooks'
import { createContentSchemaFactory } from 'nuxtseo-shared/content'
import { z } from 'zod'
import { registerCollectionHooks } from './content-hooks.ts'

export type { SitemapCollectionHooks } from './content-hooks'

export interface DefineSitemapSchemaOptions<TEntry = Record<string, unknown>> extends SitemapCollectionHooks<TEntry, SitemapSchema> {
  z?: typeof z
}

const { defineSchema, asCollection, schema } = createContentSchemaFactory({
  fieldName: 'sitemap',
  label: 'sitemap',
  docsUrl: 'https://nuxtseo.com/sitemap/guides/content',
  buildSchema: _z => buildSitemapObjectSchema(_z),
  onDefineSchema: (options: DefineSitemapSchemaOptions) => {
    if ('type' in options || 'source' in options)
      throw new Error('[sitemap] `defineSitemapSchema()` returns a schema field, not a collection wrapper. Use it inside your schema: `schema: z.object({ sitemap: defineSitemapSchema() })`. See https://nuxtseo.com/sitemap/guides/content')
    registerCollectionHooks<Record<string, unknown>, SitemapSchema>(options, 'defineSitemapSchema')
  },
}, z)

export { defineSchema as defineSitemapSchema, schema }

export interface SitemapSchema { sitemap?: TypeOf<ReturnType<typeof buildSitemapObjectSchema>> }

/** @deprecated Use `defineSitemapSchema()` in your collection schema instead. See https://nuxtseo.com/sitemap/guides/content */
export function asSitemapCollection<T>(collection: Collection<T>, options?: DefineSitemapSchemaOptions<T>): Collection<T> {
  registerCollectionHooks<T, SitemapSchema>(options, 'asSitemapCollection')
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
