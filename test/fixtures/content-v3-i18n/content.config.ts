import { dirname, resolve } from 'node:path'
import { defineCollection, defineContentConfig } from '@nuxt/content'
import { defineSitemapSchema } from '../../../src/content'
import { z } from 'zod'

const dirName = dirname(import.meta.url.replace('file://', ''))

export default defineContentConfig({
  collections: {
    content_en: defineCollection({
      type: 'page',
      source: {
        include: 'en/**',
        prefix: '/',
        cwd: resolve(dirName, 'content'),
      },
      schema: z.object({
        sitemap: defineSitemapSchema(),
      }),
    }),
    content_ja: defineCollection({
      type: 'page',
      source: {
        include: 'ja/**',
        prefix: '/',
        cwd: resolve(dirName, 'content'),
      },
      schema: z.object({
        sitemap: defineSitemapSchema(),
      }),
    }),
  },
})
