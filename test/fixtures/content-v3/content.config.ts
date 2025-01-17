import { defineCollection, defineContentConfig, z } from '@nuxt/content'
import { asSitemapCollection } from '../../../src/content'

export default defineContentConfig({
  collections: {
    content: defineCollection(
      asSitemapCollection({
        type: 'page',
        source: '**/*.md',
        schema: z.object({
          date: z.string().optional(),
        }),
      }),
    ),
  },
})
