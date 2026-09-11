import { getHeader } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sitemaps-resolved', ({ sitemaps, event }) => {
    const host = getHeader(event, 'x-forwarded-host') || getHeader(event, 'host') || ''
    if (!host)
      return
    // a per-domain sitemap: only visible to the domain whose hook call registered it
    const name = `host-flag-${host}`
    if (!(name in sitemaps))
      sitemaps[name] = { sitemapName: name, urls: [`/${name}`] }
    // a shared definition whose source response depends on the request host
    if (!('host-echo' in sitemaps))
      sitemaps['host-echo'] = { sitemapName: 'host-echo', sources: ['/api/__sitemap__/host-echo'] }
  })
})
