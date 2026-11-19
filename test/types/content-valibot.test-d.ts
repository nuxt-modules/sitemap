import type { PageCollectionItemBase } from '@nuxt/content'
import { describe, expectTypeOf, it } from 'vitest'
import { defineSitemapSchema as defineZodSitemapSchema } from '../../src/content'
import { defineSitemapSchema } from '../../src/content-valibot'

describe('content callbacks', () => {
  it('receives serialized dates with Valibot', () => {
    defineSitemapSchema({
      name: 'pages',
      onUrl: (_, entry) => {
        expectTypeOf(entry.sitemap?.lastmod).toEqualTypeOf<string | undefined>()
        expectTypeOf(entry.sitemap?.videos?.[0]?.expiration_date).toEqualTypeOf<string | undefined>()
      },
    })
  })

  it('accepts an existing filter typed with a stored Zod date', () => {
    type Page = PageCollectionItemBase & { sitemap?: { lastmod?: string } }
    defineZodSitemapSchema({
      name: 'pages',
      filter: (entry: Page) => Boolean(entry.sitemap?.lastmod),
    })
  })
})
