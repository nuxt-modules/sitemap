import type { NitroRouteConfig } from 'nitro/types'
import { defineEventHandler } from 'nuxt/server'

const routeRule = {
  sitemap: false,
} satisfies NitroRouteConfig

export default defineEventHandler(() => routeRule)
