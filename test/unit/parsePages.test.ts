import { describe, expect, it } from 'vitest'
import { convertNuxtPagesToSitemapEntries } from '../../src/util/nuxtSitemap'

const payload = [{ name: 'slug___en', path: '/:slug(.*)*', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/[...slug].vue', children: [] }, { name: 'slug___fr', path: '/fr/:slug(.*)*', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/[...slug].vue', children: [] }, { name: 'about___en', path: '/about', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/about.vue', children: [] }, { name: 'about___fr', path: '/fr/a-propos', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/about.vue', children: [] }, { path: '/blog', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog.vue', children: [{ name: 'blog-id___en', path: ':id()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/[id].vue', children: [] }, { name: 'blog-categories___en', path: 'categories', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/categories.vue', children: [] }, { name: 'blog___en', path: '', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/index.vue', children: [] }, { name: 'blog-tags___en', path: 'tags', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags.vue', children: [{ name: 'blog-tags-edit___en', path: 'edit', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags/edit.vue', children: [] }, { name: 'blog-tags-new___en', path: 'new', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags/new.vue', children: [] }] }] }, { path: '/fr/blog', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog.vue', children: [{ name: 'blog-id___fr', path: ':id()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/[id].vue', children: [] }, { name: 'blog-categories___fr', path: 'categories', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/categories.vue', children: [] }, { name: 'blog___fr', path: '', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/index.vue', children: [] }, { name: 'blog-tags___fr', path: 'tags', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags.vue', children: [{ name: 'blog-tags-edit___fr', path: 'edit', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags/edit.vue', children: [] }, { name: 'blog-tags-new___fr', path: 'new', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/blog/tags/new.vue', children: [] }] }] }, { name: 'hidden-path-but-in-sitemap___en', path: '/hidden-path-but-in-sitemap', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/hidden-path-but-in-sitemap/index.vue', children: [] }, { name: 'hidden-path-but-in-sitemap___fr', path: '/fr/hidden-path-but-in-sitemap', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/hidden-path-but-in-sitemap/index.vue', children: [] }, { name: 'index___en', path: '/', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/index.vue', children: [] }, { name: 'index___fr', path: '/fr', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/index.vue', children: [] }, { name: 'new-page___en', path: '/new-page', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/new-page.vue', children: [] }, { name: 'new-page___fr', path: '/fr/new-page', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/new-page.vue', children: [] }, { name: 'secret___en', path: '/secret', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/secret.vue', children: [] }, { name: 'secret___fr', path: '/fr/secret', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/secret.vue', children: [] }, { name: 'users-group-id___en', path: '/users-:group()/:id()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/users-[group]/[id].vue', children: [] }, { name: 'users-group-id___fr', path: '/fr/users-:group()/:id()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/users-[group]/[id].vue', children: [] }, { name: 'users-group___en', path: '/users-:group()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/users-[group]/index.vue', children: [] }, { name: 'users-group___fr', path: '/fr/users-:group()', file: '/home/harlan/packages/nuxt-simple-sitemap/.playground/pages/users-[group]/index.vue', children: [] }]

describe('page parser', () => {
  it('is parsed', () => {
    expect(convertNuxtPagesToSitemapEntries(payload, {
      isI18nMapped: true,
      autoLastmod: false,
      defaultLocale: 'en',
      normalisedLocales: [{ code: 'en' }, { code: 'fr' }],
      strategy: 'no_prefix',
    })).toMatchInlineSnapshot(`
      [
        {
          "_sitemap": "en",
          "alternatives": [
            {
              "href": "/about",
              "hreflang": "en",
            },
            {
              "href": "/fr/a-propos",
              "hreflang": "fr",
            },
            {
              "href": "/about",
              "hreflang": "x-default",
            },
          ],
          "loc": "/about",
        },
        {
          "_sitemap": "fr",
          "alternatives": [
            {
              "href": "/about",
              "hreflang": "en",
            },
            {
              "href": "/fr/a-propos",
              "hreflang": "fr",
            },
            {
              "href": "/about",
              "hreflang": "x-default",
            },
          ],
          "loc": "/fr/a-propos",
        },
        {
          "_sitemap": "en",
          "alternatives": [
            {
              "href": "/blog/categories",
              "hreflang": "en",
            },
            {
              "href": "/fr/blog/categories",
              "hreflang": "fr",
            },
            {
              "href": "/blog/categories",
              "hreflang": "x-default",
            },
          ],
          "loc": "/blog/categories",
        },
        {
          "_sitemap": "fr",
          "alternatives": [
            {
              "href": "/blog/categories",
              "hreflang": "en",
            },
            {
              "href": "/fr/blog/categories",
              "hreflang": "fr",
            },
            {
              "href": "/blog/categories",
              "hreflang": "x-default",
            },
          ],
          "loc": "/fr/blog/categories",
        },
        {
          "_sitemap": "en",
          "alternatives": [
            {
              "href": "/blog",
              "hreflang": "en",
            },
            {
              "href": "/fr/blog",
              "hreflang": "fr",
            },
            {
              "href": "/blog",
              "hreflang": "x-default",
            },
          ],
          "loc": "/blog",
        },
        {
          "_sitemap": "fr",
          "alternatives": [
            {
              "href": "/blog",
              "hreflang": "en",
            },
            {
              "href": "/fr/blog",
              "hreflang": "fr",
            },
            {
              "href": "/blog",
              "hreflang": "x-default",
            },
          ],
          "loc": "/fr/blog",
        },
        {
          "_sitemap": "en",
          "alternatives": [
            {
              "href": "/blog/tags",
              "hreflang": "en",
            },
            {
              "href": "/fr/blog/tags",
              "hreflang": "fr",
            },
            {
              "href": "/blog/tags",
              "hreflang": "x-default",
            },
          ],
          "loc": "/blog/tags",
        },
        {
          "_sitemap": "fr",
          "alternatives": [
            {
              "href": "/blog/tags",
              "hreflang": "en",
            },
            {
              "href": "/fr/blog/tags",
              "hreflang": "fr",
            },
            {
              "href": "/blog/tags",
              "hreflang": "x-default",
            },
          ],
          "loc": "/fr/blog/tags",
        },
        {
          "_sitemap": "en",
          "alternatives": [
            {
              "href": "/blog/tags/edit",
              "hreflang": "en",
            },
            {
              "href": "/fr/blog/tags/edit",
              "hreflang": "fr",
            },
            {
              "href": "/blog/tags/edit",
              "hreflang": "x-default",
            },
          ],
          "loc": "/blog/tags/edit",
        },
        {
          "_sitemap": "fr",
          "alternatives": [
            {
              "href": "/blog/tags/edit",
              "hreflang": "en",
            },
            {
              "href": "/fr/blog/tags/edit",
              "hreflang": "fr",
            },
            {
              "href": "/blog/tags/edit",
              "hreflang": "x-default",
            },
          ],
          "loc": "/fr/blog/tags/edit",
        },
        {
          "_sitemap": "en",
          "alternatives": [
            {
              "href": "/blog/tags/new",
              "hreflang": "en",
            },
            {
              "href": "/fr/blog/tags/new",
              "hreflang": "fr",
            },
            {
              "href": "/blog/tags/new",
              "hreflang": "x-default",
            },
          ],
          "loc": "/blog/tags/new",
        },
        {
          "_sitemap": "fr",
          "alternatives": [
            {
              "href": "/blog/tags/new",
              "hreflang": "en",
            },
            {
              "href": "/fr/blog/tags/new",
              "hreflang": "fr",
            },
            {
              "href": "/blog/tags/new",
              "hreflang": "x-default",
            },
          ],
          "loc": "/fr/blog/tags/new",
        },
        {
          "_sitemap": "en",
          "alternatives": [
            {
              "href": "/hidden-path-but-in-sitemap",
              "hreflang": "en",
            },
            {
              "href": "/fr/hidden-path-but-in-sitemap",
              "hreflang": "fr",
            },
            {
              "href": "/hidden-path-but-in-sitemap",
              "hreflang": "x-default",
            },
          ],
          "loc": "/hidden-path-but-in-sitemap",
        },
        {
          "_sitemap": "fr",
          "alternatives": [
            {
              "href": "/hidden-path-but-in-sitemap",
              "hreflang": "en",
            },
            {
              "href": "/fr/hidden-path-but-in-sitemap",
              "hreflang": "fr",
            },
            {
              "href": "/hidden-path-but-in-sitemap",
              "hreflang": "x-default",
            },
          ],
          "loc": "/fr/hidden-path-but-in-sitemap",
        },
        {
          "_sitemap": "en",
          "alternatives": [
            {
              "href": "/",
              "hreflang": "en",
            },
            {
              "href": "/fr",
              "hreflang": "fr",
            },
            {
              "href": "/",
              "hreflang": "x-default",
            },
          ],
          "loc": "/",
        },
        {
          "_sitemap": "fr",
          "alternatives": [
            {
              "href": "/",
              "hreflang": "en",
            },
            {
              "href": "/fr",
              "hreflang": "fr",
            },
            {
              "href": "/",
              "hreflang": "x-default",
            },
          ],
          "loc": "/fr",
        },
        {
          "_sitemap": "en",
          "alternatives": [
            {
              "href": "/new-page",
              "hreflang": "en",
            },
            {
              "href": "/fr/new-page",
              "hreflang": "fr",
            },
            {
              "href": "/new-page",
              "hreflang": "x-default",
            },
          ],
          "loc": "/new-page",
        },
        {
          "_sitemap": "fr",
          "alternatives": [
            {
              "href": "/new-page",
              "hreflang": "en",
            },
            {
              "href": "/fr/new-page",
              "hreflang": "fr",
            },
            {
              "href": "/new-page",
              "hreflang": "x-default",
            },
          ],
          "loc": "/fr/new-page",
        },
        {
          "_sitemap": "en",
          "alternatives": [
            {
              "href": "/secret",
              "hreflang": "en",
            },
            {
              "href": "/fr/secret",
              "hreflang": "fr",
            },
            {
              "href": "/secret",
              "hreflang": "x-default",
            },
          ],
          "loc": "/secret",
        },
        {
          "_sitemap": "fr",
          "alternatives": [
            {
              "href": "/secret",
              "hreflang": "en",
            },
            {
              "href": "/fr/secret",
              "hreflang": "fr",
            },
            {
              "href": "/secret",
              "hreflang": "x-default",
            },
          ],
          "loc": "/fr/secret",
        },
      ]
    `)
  })
})
