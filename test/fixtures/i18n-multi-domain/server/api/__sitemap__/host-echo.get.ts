import { defineEventHandler, getRequestHost } from 'h3'

export default defineEventHandler(event => ({
  urls: [{ loc: `/echo-${getRequestHost(event, { xForwardedHost: true })}`, _sitemap: 'host-echo' }],
}))
