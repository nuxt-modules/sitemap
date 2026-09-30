import type { NitroRouteConfig } from 'nitro/types'
import { eventHandler } from 'nitro/h3'

type SitemapRouteConfig = NitroRouteConfig & { sitemap?: boolean }

const routeRule = {
  sitemap: false,
} satisfies SitemapRouteConfig

export default eventHandler(() => routeRule)
