import type { RequestEvent } from 'nuxt/server'
import { createError, getRequestURL, getRouterParam, sendRedirect, useRuntimeConfig } from 'nuxt/server'
import { joinURL, withBase, withLeadingSlash, withoutBase, withoutLeadingSlash, withoutTrailingSlash } from 'ufo'
import { useNitroApp } from '#nuxtseo/nitro'
import { useResolvedSitemapRuntimeConfig, useSitemapRuntimeConfig } from '../utils'
import { urlsToIndexXml, urlsToIndexXmlStream } from './builder/index-xml'
import { buildSitemapIndex } from './builder/sitemap-index'
import { createSitemap, renderSitemapOutput, setSitemapResponseHeaders, useNitroUrlResolvers } from './nitro'
import { getSitemapConfig, parseChunkInfo } from './utils/chunk'

export async function sitemapXmlEventHandler(e: RequestEvent) {
  const runtimeConfig = await useResolvedSitemapRuntimeConfig(e)
  const { sitemaps } = runtimeConfig
  if ('index' in sitemaps)
    return sendRedirect(e, withBase('/sitemap_index.xml', useRuntimeConfig().app.baseURL), import.meta.dev ? 302 : 301)

  return createSitemap(e, Object.values(sitemaps)[0]!, runtimeConfig)
}

export async function sitemapIndexXmlEventHandler(e: RequestEvent) {
  const runtimeConfig = await useResolvedSitemapRuntimeConfig(e)
  const nitro = useNitroApp()
  const resolvers = useNitroUrlResolvers(e)
  const { entries: sitemaps, failedSources } = await buildSitemapIndex(resolvers, runtimeConfig, nitro)

  if (import.meta.prerender) {
    e.res.headers.append(
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

  const output = await renderSitemapOutput(
    nitro,
    e,
    'sitemap',
    () => urlsToIndexXml(indexResolvedCtx.sitemaps, resolvers, runtimeConfig, errorInfo),
    () => urlsToIndexXmlStream(indexResolvedCtx.sitemaps, resolvers, runtimeConfig, errorInfo),
    !!runtimeConfig.experimentalStreaming && !import.meta.prerender,
    runtimeConfig.debug,
  )

  setSitemapResponseHeaders(e, runtimeConfig)
  return output
}

export async function sitemapChildXmlEventHandler(e: RequestEvent) {
  // Only process .xml requests - pass through for other paths
  const pathname = getRequestURL(e).pathname
  if (!pathname.endsWith('.xml'))
    return

  const runtimeConfig = await useResolvedSitemapRuntimeConfig(e)
  const { sitemaps } = runtimeConfig

  let sitemapName = getRouterParam(e, 'sitemap', { decode: true })
  if (!sitemapName) {
    const match = pathname.match(/(?:\/__sitemap__\/)?(.+)\.xml$/)
    if (match)
      sitemapName = match[1]
  }

  if (!sitemapName)
    throw createError({ status: 400, message: 'Invalid sitemap request' })

  sitemapName = sitemapName.replace(/\.xml$/, '')
  sitemapName = withLeadingSlash(sitemapName)
  if (sitemapName.startsWith('/__sitemap__/'))
    sitemapName = sitemapName.replace('/__sitemap__/', '/')

  if (runtimeConfig.sitemapsPathPrefix) {
    const prefix = withLeadingSlash(runtimeConfig.sitemapsPathPrefix)
    if (sitemapName.startsWith(prefix))
      sitemapName = sitemapName.replace(prefix, '/')
  }
  sitemapName = withoutLeadingSlash(withoutTrailingSlash(sitemapName))

  const chunkInfo = parseChunkInfo(sitemapName, sitemaps, runtimeConfig.defaultSitemapsChunkSize)
  const isAutoChunked = typeof sitemaps.chunks !== 'undefined' && !Number.isNaN(Number(sitemapName))
  // hasOwn: `in` would also match Object.prototype keys like "toString"
  const sitemapExists = Object.hasOwn(sitemaps, sitemapName) || Object.hasOwn(sitemaps, chunkInfo.baseSitemapName) || isAutoChunked

  if (!sitemapExists)
    throw createError({ status: 404, message: `Sitemap "${sitemapName}" not found.` })

  if (chunkInfo.isChunked && chunkInfo.chunkIndex !== undefined) {
    const baseSitemap = sitemaps[chunkInfo.baseSitemapName]
    if (baseSitemap && !baseSitemap.chunks && !baseSitemap._isChunking)
      throw createError({ status: 404, message: `Sitemap "${chunkInfo.baseSitemapName}" does not support chunking.` })

    if (baseSitemap?._chunkCount !== undefined && chunkInfo.chunkIndex >= baseSitemap._chunkCount)
      throw createError({ status: 404, message: `Chunk ${chunkInfo.chunkIndex} does not exist for sitemap "${chunkInfo.baseSitemapName}".` })
  }

  const sitemapConfig = getSitemapConfig(sitemapName, sitemaps, runtimeConfig.defaultSitemapsChunkSize || undefined)
  return createSitemap(e, sitemapConfig, runtimeConfig)
}

const ROOT_CHUNK_PATH_RE = /^\/(.+)-\d+\.xml$/

/**
 * Serves `/<name>-<index>.xml` for chunked sitemaps when `sitemapsPathPrefix` is `/`.
 *
 * The router cannot match a partial segment such as `/<name>-*.xml` at the root, and a
 * `/**` route would shadow the app. So this runs as middleware and passes on every
 * request that is not a chunk of a chunked sitemap.
 */
export async function sitemapRootChunkEventHandler(e: RequestEvent) {
  const pathname = withoutBase(getRequestURL(e).pathname, useRuntimeConfig().app.baseURL)
  const name = ROOT_CHUNK_PATH_RE.exec(pathname)?.[1]
  if (!name || !useSitemapRuntimeConfig(e).sitemaps[name]?.chunks)
    return
  return sitemapChildXmlEventHandler(e)
}
