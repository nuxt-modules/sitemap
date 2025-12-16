import type { H3Event } from 'h3'
import { appendHeader, createError, getRouterParam, sendRedirect, setHeader } from 'h3'
import { joinURL, withBase, withoutLeadingSlash, withoutTrailingSlash } from 'ufo'
import { useRuntimeConfig, useNitroApp } from 'nitropack/runtime'
import { useSitemapRuntimeConfig } from '../utils'
import { createSitemap, useNitroUrlResolvers } from './nitro'
import { buildSitemapIndex, urlsToIndexXml } from './builder/sitemap-index'
import { parseChunkInfo, getSitemapConfig } from './utils/chunk'

export async function sitemapXmlEventHandler(e: H3Event) {
  const runtimeConfig = useSitemapRuntimeConfig()
  const { sitemaps } = runtimeConfig
  if ('index' in sitemaps)
    return sendRedirect(e, withBase('/sitemap_index.xml', useRuntimeConfig().app.baseURL), import.meta.dev ? 302 : 301)

  return createSitemap(e, Object.values(sitemaps)[0]!, runtimeConfig)
}

export async function sitemapIndexXmlEventHandler(e: H3Event) {
  const runtimeConfig = useSitemapRuntimeConfig()
  const nitro = useNitroApp()
  const resolvers = useNitroUrlResolvers(e)
  const { entries: sitemaps, failedSources } = await buildSitemapIndex(resolvers, runtimeConfig, nitro)

  if (import.meta.prerender) {
    appendHeader(
      e,
      'x-nitro-prerender',
      sitemaps.filter(entry => !!entry._sitemapName)
        .map(entry => encodeURIComponent(joinURL(runtimeConfig.sitemapsPathPrefix || '', `/${entry._sitemapName}.xml`))).join(', '),
    )
  }

  const indexResolvedCtx = { sitemaps, event: e }
  await nitro.hooks.callHook('sitemap:index-resolved', indexResolvedCtx)

  const errorInfo = failedSources.length > 0
    ? { messages: failedSources.map(f => f.error), urls: failedSources.map(f => f.url) }
    : undefined

  const output = urlsToIndexXml(indexResolvedCtx.sitemaps, resolvers, runtimeConfig, errorInfo)
  const ctx = { sitemap: output, sitemapName: 'sitemap', event: e }
  await nitro.hooks.callHook('sitemap:output', ctx)

  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (runtimeConfig.cacheMaxAgeSeconds)
    setHeader(e, 'Cache-Control', `public, max-age=${runtimeConfig.cacheMaxAgeSeconds}, s-maxage=${runtimeConfig.cacheMaxAgeSeconds}, stale-while-revalidate=3600`)
  else
    setHeader(e, 'Cache-Control', `no-cache, no-store`)

  return ctx.sitemap
}

export async function sitemapChildXmlEventHandler(e: H3Event) {
  const runtimeConfig = useSitemapRuntimeConfig(e)
  const { sitemaps } = runtimeConfig

  let sitemapName = getRouterParam(e, 'sitemap')
  if (!sitemapName) {
    const path = e.path
    const match = path.match(/(?:\/__sitemap__\/)?([^/]+)\.xml$/)
    if (match)
      sitemapName = match[1]
  }

  if (!sitemapName)
    throw createError({ statusCode: 400, message: 'Invalid sitemap request' })

  sitemapName = withoutLeadingSlash(withoutTrailingSlash(sitemapName.replace('.xml', '')
    .replace('__sitemap__/', '')
    .replace(runtimeConfig.sitemapsPathPrefix || '', '')))

  const chunkInfo = parseChunkInfo(sitemapName, sitemaps, runtimeConfig.defaultSitemapsChunkSize)
  const isAutoChunked = typeof sitemaps.chunks !== 'undefined' && !Number.isNaN(Number(sitemapName))
  const sitemapExists = sitemapName in sitemaps || chunkInfo.baseSitemapName in sitemaps || isAutoChunked

  if (!sitemapExists)
    throw createError({ statusCode: 404, message: `Sitemap "${sitemapName}" not found.` })

  if (chunkInfo.isChunked && chunkInfo.chunkIndex !== undefined) {
    const baseSitemap = sitemaps[chunkInfo.baseSitemapName]
    if (baseSitemap && !baseSitemap.chunks && !baseSitemap._isChunking)
      throw createError({ statusCode: 404, message: `Sitemap "${chunkInfo.baseSitemapName}" does not support chunking.` })

    if (baseSitemap?._chunkCount !== undefined && chunkInfo.chunkIndex >= baseSitemap._chunkCount)
      throw createError({ statusCode: 404, message: `Chunk ${chunkInfo.chunkIndex} does not exist for sitemap "${chunkInfo.baseSitemapName}".` })
  }

  const sitemapConfig = getSitemapConfig(sitemapName, sitemaps, runtimeConfig.defaultSitemapsChunkSize || undefined)
  return createSitemap(e, sitemapConfig, runtimeConfig)
}
