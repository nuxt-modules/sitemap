import { defineEventHandler, setHeader } from 'h3'
import { parseURL } from 'ufo'
import { buildSitemap } from '../util/builder'
import { useHostname } from '../util/nuxt'
import type { SitemapRenderCtx } from '../../types'
import * as sitemapConfig from '#nuxt-simple-sitemap/config'
import { useNitroApp, useRuntimeConfig } from '#internal/nitro'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'

export default defineEventHandler(async (e) => {
  const path = parseURL(e.path).pathname
  if (!path.endsWith('-sitemap.xml'))
    return

  const sitemapName = path.replace('-sitemap.xml', '').replace('/', '')
  if (sitemapConfig.sitemaps !== true && !sitemapConfig.sitemaps[sitemapName])
    return

  // need to clone the config object to make it writable
  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  const callHook = async (ctx: SitemapRenderCtx) => {
    const nitro = useNitroApp()
    await nitro.hooks.callHook('sitemap:ssr', ctx)
  }
  return await buildSitemap({
    sitemapName,
    sitemapConfig: { ...sitemapConfig, ...sitemapConfig.sitemaps[sitemapName], siteUrl: useHostname(e, sitemapConfig.siteUrl) },
    baseURL: useRuntimeConfig().app.baseURL,
    getRouteRulesForPath,
    callHook,
  })
})
