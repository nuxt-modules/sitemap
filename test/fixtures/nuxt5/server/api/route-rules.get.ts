import type { NitroRouteConfig, NitroRouteRules } from 'nitro/types'
import { getRouteRules } from 'nitro/app'
import { defineEventHandler } from 'nuxt/server'

const routeConfig = {
  sitemap: { priority: 0.3, changefreq: 'yearly' },
} satisfies NitroRouteConfig

export default defineEventHandler((event) => {
  const routeRules = {
    sitemap: getRouteRules(event.req.method, event.url.pathname).routeRules.sitemap,
  } satisfies NitroRouteRules
  return {
    config: routeConfig.sitemap,
    resolved: routeRules.sitemap,
  }
})
