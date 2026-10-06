import type { AppRouteRules } from 'nuxt/server'
import { defineEventHandler } from 'nuxt/server'

type SitemapRouteConfig = AppRouteRules & { sitemap?: boolean }

const routeRule = {
  sitemap: false,
} satisfies SitemapRouteConfig

export default defineEventHandler(() => routeRule)
