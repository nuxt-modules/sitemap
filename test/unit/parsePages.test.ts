import { describe, expect, it } from 'vitest'
import { convertNuxtPagesToSitemapEntries } from '../../src/utils'

const payload = [{ name: 'slug___en', path: '/:slug(.*)*', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/[...slug].vue', children: [] }, { name: 'slug___fr', path: '/fr/:slug(.*)*', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/[...slug].vue', children: [] }, { name: 'about___en', path: '/about', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/about.vue', children: [] }, { name: 'about___fr', path: '/fr/a-propos', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/about.vue', children: [] }, { path: '/blog', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog.vue', children: [{ name: 'blog-id___en', path: ':id()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/[id].vue', children: [] }, { name: 'blog-categories___en', path: 'categories', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/categories.vue', children: [] }, { name: 'blog___en', path: '', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/index.vue', children: [] }, { name: 'blog-tags___en', path: 'tags', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags.vue', children: [{ name: 'blog-tags-edit___en', path: 'edit', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags/edit.vue', children: [] }, { name: 'blog-tags-new___en', path: 'new', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags/new.vue', children: [] }] }] }, { path: '/fr/blog', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog.vue', children: [{ name: 'blog-id___fr', path: ':id()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/[id].vue', children: [] }, { name: 'blog-categories___fr', path: 'categories', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/categories.vue', children: [] }, { name: 'blog___fr', path: '', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/index.vue', children: [] }, { name: 'blog-tags___fr', path: 'tags', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags.vue', children: [{ name: 'blog-tags-edit___fr', path: 'edit', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags/edit.vue', children: [] }, { name: 'blog-tags-new___fr', path: 'new', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags/new.vue', children: [] }] }] }, { name: 'hidden-path-but-in-sitemap___en', path: '/hidden-path-but-in-sitemap', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/hidden-path-but-in-sitemap/index.vue', children: [] }, { name: 'hidden-path-but-in-sitemap___fr', path: '/fr/hidden-path-but-in-sitemap', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/hidden-path-but-in-sitemap/index.vue', children: [] }, { name: 'index___en', path: '/', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/index.vue', children: [] }, { name: 'index___fr', path: '/fr', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/index.vue', children: [] }, { name: 'new-page___en', path: '/new-page', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/new-page.vue', children: [] }, { name: 'new-page___fr', path: '/fr/new-page', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/new-page.vue', children: [] }, { name: 'secret___en', path: '/secret', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/secret.vue', children: [] }, { name: 'secret___fr', path: '/fr/secret', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/secret.vue', children: [] }, { name: 'users-group-id___en', path: '/users-:group()/:id()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/users-[group]/[id].vue', children: [] }, { name: 'users-group-id___fr', path: '/fr/users-:group()/:id()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/users-[group]/[id].vue', children: [] }, { name: 'users-group___en', path: '/users-:group()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/users-[group]/index.vue', children: [] }, { name: 'users-group___fr', path: '/fr/users-:group()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/users-[group]/index.vue', children: [] }]

describe('page parser', () => {
  it('is parsed', () => {
    expect(convertNuxtPagesToSitemapEntries(payload, { autoLastmod: true, defaultLocale: 'en' })).toMatchInlineSnapshot(`
      [
        {
          "alternatives": [
            {
              "href": "/fr/a-propos",
              "hreflang": "fr",
            },
          ],
          "lastmod": 2023-07-06T09:38:34.086Z,
          "loc": "/about",
        },
        {
          "alternatives": [
            {
              "href": "/fr/blog/categories",
              "hreflang": "fr",
            },
          ],
          "lastmod": 2023-04-28T18:08:42.444Z,
          "loc": "/blog/categories",
        },
        {
          "alternatives": [
            {
              "href": "/fr/blog",
              "hreflang": "fr",
            },
          ],
          "lastmod": 2023-04-28T18:08:42.444Z,
          "loc": "/blog",
        },
        {
          "alternatives": [
            {
              "href": "/fr/blog/tags",
              "hreflang": "fr",
            },
          ],
          "lastmod": 2023-04-28T18:08:42.444Z,
          "loc": "/blog/tags",
        },
        {
          "alternatives": [
            {
              "href": "/fr/hidden-path-but-in-sitemap",
              "hreflang": "fr",
            },
          ],
          "lastmod": 2022-12-22T00:02:26.860Z,
          "loc": "/hidden-path-but-in-sitemap",
        },
        {
          "alternatives": [
            {
              "href": "/fr",
              "hreflang": "fr",
            },
          ],
          "lastmod": 2023-06-22T01:25:58.827Z,
          "loc": "/",
        },
        {
          "alternatives": [
            {
              "href": "/fr/new-page",
              "hreflang": "fr",
            },
          ],
          "lastmod": 2023-06-22T01:26:57.324Z,
          "loc": "/new-page",
        },
        {
          "alternatives": [
            {
              "href": "/fr/secret",
              "hreflang": "fr",
            },
          ],
          "lastmod": 2023-07-06T12:36:21.206Z,
          "loc": "/secret",
        },
      ]
    `)
  })
})
