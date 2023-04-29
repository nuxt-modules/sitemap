import { defineEventHandler, setHeader } from 'h3'
import { parseURL } from 'ufo'
import { defu } from 'defu'
import { buildSitemap } from '../util/builder'
import { useHostname } from '../util/nuxt'
import type { SitemapRenderCtx } from '../../types'
import { useNitroApp, useRuntimeConfig } from '#internal/nitro'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'

export default defineEventHandler(async (e) => {
  const path = parseURL(e.path).pathname
  if (!path.endsWith('-sitemap.xml'))
    return

  const sitemapConfig = useRuntimeConfig()['nuxt-simple-sitemap']
  const sitemapName = path.replace('-sitemap.xml', '').replace('/', '')
  if (sitemapConfig.sitemaps !== true && !sitemapConfig.sitemaps[sitemapName])
    return

  // need to clone the config object to make it writable
  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  const callHook = async (ctx: SitemapRenderCtx) => {
    const nitro = useNitroApp()
    await nitro.hooks.callHook('sitemap:sitemap-xml', ctx)
  }
  // merge urls
  const { urls } = defu({ urls: sitemapConfig.sitemaps[sitemapName]?.urls || [] }, { urls: sitemapConfig.urls || [] })
  const nitroApp = useNitroApp()
  return await buildSitemap({
    $fetch: nitroApp.localFetch,
    sitemapName,
    sitemapConfig: {
      ...defu(sitemapConfig.sitemaps[sitemapName], sitemapConfig),
      siteUrl: useHostname(e),
      urls,
    },
    baseURL: useRuntimeConfig().app.baseURL,
    getRouteRulesForPath,
    callHook,
  })
})
