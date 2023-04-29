import { defineEventHandler, setHeader } from 'h3'
import { buildSitemapIndex } from '../util/builder'
import { useHostname } from '../util/nuxt'
import { useRuntimeConfig, useNitroApp } from '#internal/nitro'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'

export default defineEventHandler(async (e) => {
  const sitemapConfig = useRuntimeConfig()['nuxt-simple-sitemap']
  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  const nitroApp = useNitroApp()
  return (await buildSitemapIndex({
    $fetch: nitroApp.localFetch,
    sitemapConfig: { ...sitemapConfig, siteUrl: useHostname(e, sitemapConfig.siteUrl) },
    baseURL: useRuntimeConfig().app.baseURL,
    getRouteRulesForPath,
  })).xml
})
