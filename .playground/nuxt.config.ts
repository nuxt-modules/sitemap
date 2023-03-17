import { defineNuxtConfig } from 'nuxt/config'
import NuxtSimpleSitemap from '../src/module'

export default defineNuxtConfig({
  modules: [
    NuxtSimpleSitemap,
    'nuxt-simple-robots',
  ],
  nitro: {
    plugins: ['plugins/sitemap.ts'],
    prerender: {
      crawlLinks: true,
      routes: [
        '/',
      ]
    }
  },
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || process.env.NITRO_HOST,
    }
  },
  robots: {
    indexable: true,
  },
  sitemap: {
    sitemaps: {
      posts: {
        include: ['/blog/**']
      },
      pages: {
        exclude: ['/blog/**']
      }
    }
  },
  routeRules: {
    '/secret': {
      index: false
    },
    '/users-test/*': {
      sitemap: {
        lastmod: new Date(2023, 1, 21, 4, 50, 52),
        changefreq: 'weekly',
        priority: 0.3
      }
    },
    '/about': {
      sitemap: {
        lastmod: new Date(2023, 1, 21, 8, 50, 52),
        changefreq: 'daily',
        priority: 0.3,
        images: [
          {
            loc: 'https://example.com/image.jpg',
          },
          {
            loc: 'https://example.com/image2.jpg',
          }
        ]
      }
    },
  }
})
