import type { AppRouteRules } from 'nuxt/server'
import { defineEventHandler } from 'nuxt/server'

const routeRule = {
  sitemap: false,
} satisfies AppRouteRules

export default defineEventHandler(() => routeRule)
