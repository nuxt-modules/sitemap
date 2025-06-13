import { appendHeader, defineEventHandler, setHeader } from 'h3'
import { joinURL } from 'ufo'
import { useNitroApp } from 'nitropack/runtime'
import { useSitemapRuntimeConfig } from '../utils'
import { buildSitemapIndex, urlsToIndexXml } from '../sitemap/builder/sitemap-index'
import type { SitemapIndexRenderCtx, SitemapOutputHookCtx } from '../../types'
import { useNitroUrlResolvers } from '../sitemap/nitro'

export default defineEventHandler(async (e) => {
  const runtimeConfig = useSitemapRuntimeConfig()
  const nitro = useNitroApp()
  const resolvers = useNitroUrlResolvers(e)
  const { entries: sitemaps, failedSources } = await buildSitemapIndex(resolvers, runtimeConfig, nitro)

  // tell the prerender to render the other sitemaps (if we prerender this one)
  // this solves the dynamic chunking sitemap issue
  if (import.meta.prerender) {
    appendHeader(
      e,
      'x-nitro-prerender',
      sitemaps.filter(entry => !!entry._sitemapName)
        .map(entry => encodeURIComponent(joinURL(runtimeConfig.sitemapsPathPrefix || '', `/${entry._sitemapName}.xml`))).join(', '),
    )
  }

  const indexResolvedCtx: SitemapIndexRenderCtx = { sitemaps, event: e }
  await nitro.hooks.callHook('sitemap:index-resolved', indexResolvedCtx)

  // Prepare error information for XSL if there are failed sources
  const errorInfo = failedSources.length > 0
    ? {
        messages: failedSources.map(f => f.error),
        urls: failedSources.map(f => f.url),
      }
    : undefined

  const output = urlsToIndexXml(indexResolvedCtx.sitemaps, resolvers, runtimeConfig, errorInfo)
  const ctx: SitemapOutputHookCtx = { sitemap: output, sitemapName: 'sitemap', event: e }
  await nitro.hooks.callHook('sitemap:output', ctx)

  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (runtimeConfig.cacheMaxAgeSeconds) {
    setHeader(e, 'Cache-Control', `public, max-age=${runtimeConfig.cacheMaxAgeSeconds}, s-maxage=${runtimeConfig.cacheMaxAgeSeconds}, stale-while-revalidate=3600`)

    // Add debug headers when caching is enabled
    const now = new Date()
    setHeader(e, 'X-Sitemap-Generated', now.toISOString())
    setHeader(e, 'X-Sitemap-Cache-Duration', `${runtimeConfig.cacheMaxAgeSeconds}s`)

    // Calculate expiry time
    const expiryTime = new Date(now.getTime() + (runtimeConfig.cacheMaxAgeSeconds * 1000))
    setHeader(e, 'X-Sitemap-Cache-Expires', expiryTime.toISOString())

    // Calculate remaining time
    const remainingSeconds = Math.floor((expiryTime.getTime() - now.getTime()) / 1000)
    setHeader(e, 'X-Sitemap-Cache-Remaining', `${remainingSeconds}s`)
  }
  else {
    setHeader(e, 'Cache-Control', `no-cache, no-store`)
  }
  return ctx.sitemap
})
