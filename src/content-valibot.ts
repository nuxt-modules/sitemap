import type { SitemapCollectionHooks } from './content-hooks'
import * as v from 'valibot'
import { registerCollectionHooks } from './content-hooks'

export type { SitemapCollectionHooks } from './content-hooks'

export type DefineSitemapSchemaOptions<TEntry = Record<string, unknown>> = SitemapCollectionHooks<TEntry, SitemapSchema>

interface SitemapSchema { sitemap?: v.InferOutput<ReturnType<typeof buildSitemapSchema>> }

export function defineSitemapSchema<TEntry = Record<string, unknown>>(options?: DefineSitemapSchemaOptions<TEntry>) {
  registerCollectionHooks<TEntry, SitemapSchema>(options, 'defineSitemapSchema')
  return buildSitemapSchema()
}

function buildSitemapSchema() {
  return v.optional(v.object({
    loc: v.optional(v.string()),
    lastmod: v.optional(v.date()),
    changefreq: v.optional(v.picklist(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'])),
    priority: v.optional(v.number()),
    images: v.optional(v.array(v.object({
      loc: v.string(),
      caption: v.optional(v.string()),
      geo_location: v.optional(v.string()),
      title: v.optional(v.string()),
      license: v.optional(v.string()),
    }))),
    videos: v.optional(v.array(v.object({
      content_loc: v.string(),
      player_loc: v.optional(v.string()),
      duration: v.optional(v.string()),
      expiration_date: v.optional(v.date()),
      rating: v.optional(v.number()),
      view_count: v.optional(v.number()),
      publication_date: v.optional(v.date()),
      family_friendly: v.optional(v.boolean()),
      tag: v.optional(v.string()),
      category: v.optional(v.string()),
      restriction: v.optional(v.object({
        relationship: v.optional(v.literal('allow')),
        value: v.optional(v.string()),
      })),
      gallery_loc: v.optional(v.string()),
      price: v.optional(v.string()),
      requires_subscription: v.optional(v.boolean()),
      uploader: v.optional(v.string()),
    }))),
  }))
}
