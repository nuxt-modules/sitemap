import { appendHeader, defineEventHandler, setHeader } from 'h3'
import { joinURL } from 'ufo'
import { useNitroApp } from 'nitropack/runtime'
import { useSimpleSitemapRuntimeConfig } from '../utils'
import { buildSitemapIndex, urlsToIndexXml } from '../sitemap/builder/sitemap-index'
import type { SitemapOutputHookCtx } from '../../types'
import { useNitroUrlResolvers } from '../sitemap/nitro'

export default defineEventHandler(async (e) => {
  const runtimeConfig = useSimpleSitemapRuntimeConfig()
  const nitro = useNitroApp()
  const resolvers = useNitroUrlResolvers(e)
  const sitemaps = (await buildSitemapIndex(resolvers, runtimeConfig))

  // tell the prerender to render the other sitemaps (if we prerender this one)
  // this solves the dynamic chunking sitemap issue
  if (import.meta.prerender) {
    appendHeader(
      e,
      'x-nitro-prerender',
      sitemaps.filter(entry => !!entry._sitemapName)
        .map(entry => encodeURIComponent(joinURL(runtimeConfig.sitemapsPathPrefix, `/${entry._sitemapName}.xml`))).join(', '),
    )
  }

  const indexResolvedCtx = { sitemaps }
  await nitro.hooks.callHook('sitemap:index-resolved', indexResolvedCtx)

  const output = urlsToIndexXml(indexResolvedCtx.sitemaps, resolvers, runtimeConfig)
  const ctx: SitemapOutputHookCtx = { sitemap: output, sitemapName: 'sitemap' }
  await nitro.hooks.callHook('sitemap:output', ctx)

  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (runtimeConfig.cacheMaxAgeSeconds)
    setHeader(e, 'Cache-Control', `public, max-age=${runtimeConfig.cacheMaxAgeSeconds}, must-revalidate`)
  else
    setHeader(e, 'Cache-Control', `no-cache, no-store`)
  return ctx.sitemap
})
