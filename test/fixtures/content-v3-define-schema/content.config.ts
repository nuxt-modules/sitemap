import { resolve, dirname } from 'node:path'
import { defineCollection, defineContentConfig } from '@nuxt/content'
import { defineSitemapSchema } from '../../../src/content'
import { z } from 'zod'

const dirName = dirname(import.meta.url.replace('file://', ''))

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: {
        include: '**/*',
        cwd: resolve(dirName, 'content'),
      },
      schema: z.object({
        date: z.string().optional(),
        draft: z.boolean().optional(),
        sitemap: defineSitemapSchema({
          name: 'content',
          filter: (entry) => {
            if (entry.draft)
              return false
            if (entry.date && new Date(entry.date) > new Date())
              return false
            return true
          },
        }),
      }),
    }),
  },
})
