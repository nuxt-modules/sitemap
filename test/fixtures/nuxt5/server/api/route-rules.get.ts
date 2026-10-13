import type { SitemapItemDefaults } from '@nuxtjs/sitemap'
import type { AppRouteRules } from 'nuxt/server'
import { defineEventHandler, getRouteRules } from 'nuxt/server'

const routeConfig = {
  sitemap: { priority: 0.3, changefreq: 'yearly' },
} satisfies AppRouteRules

export default defineEventHandler((event) => {
  const sitemap: SitemapItemDefaults | false | undefined = getRouteRules(event).sitemap
  return {
    config: routeConfig.sitemap,
    resolved: sitemap,
  }
})
