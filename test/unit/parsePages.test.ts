import { describe, expect, it } from 'vitest'
import type { NuxtPage } from 'nuxt/schema'
import { convertNuxtPagesToSitemapEntries } from '../../src/util/nuxtSitemap'
import { normalizeLocales } from '../../src/util/i18n'

const payload: NuxtPage[] = [
  {
    name: 'index___en',
    path: '/',
    file: 'playground/pages/index.vue',
    children: [],
  },
  {
    name: 'index___fr',
    path: '/fr',
    file: 'playground/pages/index.vue',
    children: [],
  },
  {
    name: 'custom',
    path: '/custom',
    file: 'playground/pages/[...slug].vue',
    meta: { sitemap: { lastmod: '2021-08-24T14:00:00.000Z' } },
    children: [],
  },
  {
    name: 'slug___en',
    path: '/:slug(.*)*',
    file: 'playground/pages/[...slug].vue',
    children: [],
  },
  {
    name: 'slug___fr',
    path: '/fr/:slug(.*)*',
    file: 'playground/pages/[...slug].vue',
    children: [],
  },
  {
    name: 'about___en',
    path: '/about',
    file: 'playground/pages/about.vue',
    children: [],
  },
  {
    name: 'about___fr',
    path: '/fr/a-propos',
    file: 'playground/pages/about.vue',
    children: [],
  },
  {
    path: '/blog',
    file: 'playground/pages/blog.vue',
    children: [{
      name: 'blog-id___en',
      path: ':id()',
      file: 'playground/pages/blog/[id].vue',
      children: [],
    }, {
      name: 'blog-categories___en',
      path: 'categories',
      file: 'playground/pages/blog/categories.vue',
      children: [],
    }, {
      name: 'blog___en',
      path: '',
      file: 'playground/pages/blog/index.vue',
      children: [],
    }, {
      name: 'blog-tags___en',
      path: 'tags',
      file: 'playground/pages/blog/tags.vue',
      children: [{
        name: 'blog-tags-edit___en',
        path: 'edit',
        file: 'playground/pages/blog/tags/edit.vue',
        children: [],
      }, {
        name: 'blog-tags-new___en',
        path: 'new',
        file: 'playground/pages/blog/tags/new.vue',
        children: [],
      }],
    }],
  },
  {
    path: '/fr/blog',
    file: 'playground/pages/blog.vue',
    children: [{
      name: 'blog-id___fr',
      path: ':id()',
      file: 'playground/pages/blog/[id].vue',
      children: [],
    }, {
      name: 'blog-categories___fr',
      path: 'categories',
      file: 'playground/pages/blog/categories.vue',
      children: [],
    }, {
      name: 'blog___fr',
      path: '',
      file: 'playground/pages/blog/index.vue',
      children: [],
    }, {
      name: 'blog-tags___fr',
      path: 'tags',
      file: 'playground/pages/blog/tags.vue',
      children: [{
        name: 'blog-tags-edit___fr',
        path: 'edit',
        file: 'playground/pages/blog/tags/edit.vue',
        children: [],
      }, {
        name: 'blog-tags-new___fr',
        path: 'new',
        file: 'playground/pages/blog/tags/new.vue',
        children: [],
      }],
    }],
  },
  {
    name: 'hidden-path-but-in-sitemap___en',
    path: '/hidden-path-but-in-sitemap',
    file: 'playground/pages/hidden-path-but-in-sitemap/index.vue',
    children: [],
  },
  {
    name: 'hidden-path-but-in-sitemap___fr',
    path: '/fr/hidden-path-but-in-sitemap',
    file: 'playground/pages/hidden-path-but-in-sitemap/index.vue',
    children: [],
  },
  {
    name: 'index___en',
    path: '/',
    file: 'playground/pages/index.vue',
    children: [],
  },
  {
    name: 'index___fr',
    path: '/fr',
    file: 'playground/pages/index.vue',
    children: [],
  },
  {
    name: 'new-page___en',
    path: '/new-page',
    file: 'playground/pages/new-page.vue',
    children: [],
  },
  {
    name: 'new-page___fr',
    path: '/fr/new-page',
    file: 'playground/pages/new-page.vue',
    children: [],
  },
  {
    name: 'secret___en',
    path: '/secret',
    file: 'playground/pages/secret.vue',
    children: [],
  },
  {
    name: 'secret___fr',
    path: '/fr/secret',
    file: 'playground/pages/secret.vue',
    children: [],
  },
  {
    name: 'users-group-id___en',
    path: '/users-:group()/:id()',
    file: 'playground/pages/users-[group]/[id].vue',
    children: [],
  },
  {
    name: 'users-group-id___fr',
    path: '/fr/users-:group()/:id()',
    file: 'playground/pages/users-[group]/[id].vue',
    children: [],
  },
  {
    name: 'users-group___en',
    path: '/users-:group()',
    file: 'playground/pages/users-[group]/index.vue',
    children: [],
  },
  {
    name: 'users-group___fr',
    path: '/fr/users-:group()',
    file: 'playground/pages/users-[group]/index.vue',
    children: [],
  },
]

describe('page parser', () => {
  it('is parsed', () => {
    expect(convertNuxtPagesToSitemapEntries(payload, {
      isI18nMapped: true,
      autoLastmod: false,
      defaultLocale: 'en',
      normalisedLocales: normalizeLocales({ locales: [{ code: 'en' }, { code: 'fr' }] }),
      strategy: 'no_prefix',
    })).toMatchInlineSnapshot(`
      [
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
              "href": "/",
              "hreflang": "en",
            },
            {
              "href": "/fr",
              "hreflang": "fr",
            },
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
          "lastmod": "2021-08-24T14:00:00.000Z",
          "loc": "/custom",
        },
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
