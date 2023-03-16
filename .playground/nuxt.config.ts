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
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000/',
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
        lastmod: '2023-01-21T08:50:52.000Z',
        changefreq: 'weekly',
        priority: 0.3
      }
    },
    '/about': {
      sitemap: {
        lastmod: '2023-01-21T08:50:52.000Z',
        changefreq: 'daily',
        priority: 0.3
      }
    },
  }
})
