import { defineEventHandler, getQuery, setHeader } from 'h3'
import { useSimpleSitemapRuntimeConfig } from '../utils'
import { buildSitemapIndex } from '../sitemap/builder/sitemap-index'
import { createSitePathResolver, useNitroApp } from '#imports'

export default defineEventHandler(async (e) => {
  const canonicalQuery = getQuery(e).canonical
  const isShowingCanonical = typeof canonicalQuery !== 'undefined' && canonicalQuery !== 'false'
  const runtimeConfig = useSimpleSitemapRuntimeConfig()
  let sitemap = (await buildSitemapIndex({
    event: e,
    canonicalUrlResolver: createSitePathResolver(e, { canonical: isShowingCanonical || !import.meta.dev, absolute: true, withBase: true }),
    relativeBaseUrlResolver: createSitePathResolver(e, { absolute: false, withBase: true }),
  }))

  const nitro = useNitroApp()

  const ctx = { sitemap, sitemapName: 'sitemap' }
  await nitro.hooks.callHook('sitemap:output', ctx)
  sitemap = ctx.sitemap

  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (runtimeConfig.cacheMaxAgeSeconds)
    setHeader(e, 'Cache-Control', `public, max-age=${runtimeConfig.cacheMaxAgeSeconds}, must-revalidate`)
  else
    setHeader(e, 'Cache-Control', `no-cache, no-store`)
  return sitemap
})
