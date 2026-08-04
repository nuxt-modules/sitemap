import type { NitroRouteConfig } from 'nitro/types'
import { eventHandler } from 'nitro/h3'

const routeRule = {
  sitemap: false,
} satisfies NitroRouteConfig

export default eventHandler(() => routeRule)
