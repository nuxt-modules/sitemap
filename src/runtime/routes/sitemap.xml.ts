import { defineEventHandler, sendRedirect, setHeader } from 'h3'
import { buildSitemap } from '../util/builder'
import { useHostname } from '../util/nuxt'
import type { SitemapRenderCtx } from '../../types'
import { useNitroApp, useRuntimeConfig } from '#internal/nitro'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'

export default defineEventHandler(async (e) => {
  const sitemapConfig = useRuntimeConfig()['nuxt-simple-sitemap']
  // we need to check if we're rendering multiple sitemaps from the index sitemap
  if (sitemapConfig.sitemaps) {
    // redirect to sitemap_index.xml
    return sendRedirect(e, '/sitemap_index.xml', 301)
  }

  // need to clone the config object to make it writable
  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  const callHook = async (ctx: SitemapRenderCtx) => {
    const nitro = useNitroApp()
    await nitro.hooks.callHook('sitemap:sitemap-xml', ctx)
  }
  return await buildSitemap({
    sitemapName: 'sitemap',
    sitemapConfig: { ...sitemapConfig, siteUrl: useHostname(e, sitemapConfig.siteUrl) },
    baseURL: useRuntimeConfig().app.baseURL,
    getRouteRulesForPath,
    callHook,
  })
})
