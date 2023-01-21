import { resolve } from 'pathe'
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  alias: {
    'nuxt-simple-sitemap': resolve(__dirname, '../src/module'),
  },
  modules: [
    'nuxt-simple-sitemap',
  ],
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: [
        '/',
      ]
    }
  },
  sitemap: {
    hostname: 'https://example.com',
    urls: () => [
      '/hidden-path-but-in-sitemap',
      '/users-test',
      '/users-test/1',
      '/users-test/2',
    ]
  },
  routeRules: {
    '/secret': {
      index: false
    },
    '/users-test/*': {
      sitemap: {
        lastmod: new Date().toString(),
        changefreq: 'weekly',
        priority: 0.3
      }
    },
    '/about': {
      sitemap: {
        lastmod: new Date().toString(),
        changefreq: 'daily',
        priority: 0.3
      }
    },
  }
})
