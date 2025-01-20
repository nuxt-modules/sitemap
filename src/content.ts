import { type DefinedCollection, z } from '@nuxt/content'

const sitemap = z.object({
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
}).optional()

export function asSitemapCollection<T extends DefinedCollection>(collection: T): T {
  if (collection.type !== 'page') {
    return collection
  }
  if (!collection.schema) {
    collection.schema = z.object({
      sitemap,
    })
  }
  else {
    collection.schema = collection.schema.extend({
      sitemap,
    })
  }
  return collection
}
