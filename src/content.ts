import type { Collection } from '@nuxt/content'
import type { TypeOf } from 'zod'
import { z } from '@nuxt/content'

export const schema = z.object({
  sitemap: z.object({
    loc: z.string().optional(),
    lastmod: z.date().optional(),
    changefreq: z.union([z.literal('always'), z.literal('hourly'), z.literal('daily'), z.literal('weekly'), z.literal('monthly'), z.literal('yearly'), z.literal('never')]).optional(),
    priority: z.number().optional(),
    images: z.array(z.object({
      loc: z.string(),
      caption: z.string().optional(),
      geo_location: z.string().optional(),
      title: z.string().optional(),
      license: z.string().optional(),
    })).optional(),
    videos: z.array(z.object({
      content_loc: z.string(),
      player_loc: z.string().optional(),
      duration: z.string().optional(),
      expiration_date: z.date().optional(),
      rating: z.number().optional(),
      view_count: z.number().optional(),
      publication_date: z.date().optional(),
      family_friendly: z.boolean().optional(),
      tag: z.string().optional(),
      category: z.string().optional(),
      restriction: z.object({
        relationship: z.literal('allow').optional(),
        value: z.string().optional(),
      }).optional(),
      gallery_loc: z.string().optional(),
      price: z.string().optional(),
      requires_subscription: z.boolean().optional(),
      uploader: z.string().optional(),
    })).optional(),
  }).optional(),
})

export type SitemapSchema = TypeOf<typeof schema>

export function asSitemapCollection<T>(collection: Collection<T>): Collection<T> {
  if (collection.type === 'page') {
    // @ts-expect-error untyped
    collection.schema = collection.schema ? schema.extend(collection.schema.shape) : schema
  }
  return collection
}
