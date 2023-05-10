import { defineEventHandler, setHeader } from 'h3'
import { buildSitemapIndex } from '../util/builder'
import { useHostname } from '../util/nuxt'
import { useRuntimeConfig } from '#internal/nitro'
import { getRouteRulesForPath } from '#internal/nitro/route-rules'

export default defineEventHandler(async (e) => {
  const sitemapConfig = useRuntimeConfig()['nuxt-simple-sitemap']
  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  return (await buildSitemapIndex({
    sitemapConfig: { ...sitemapConfig, host: useHostname(e) },
    baseURL: useRuntimeConfig().app.baseURL,
    getRouteRulesForPath,
  })).xml
})
