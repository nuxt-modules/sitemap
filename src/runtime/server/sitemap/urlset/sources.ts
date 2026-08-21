import type { FetchError } from 'ofetch'
import type { SitemapUrlRecord } from 'sitemapd/parse'
import type { H3Event } from '#nuxtseo/h3'
import type {
  Changefreq,
  ModuleRuntimeConfig,
  SitemapSourceBase,
  SitemapSourceInput,
  SitemapSourceResolved,
  SitemapUrl,
  SitemapUrlInput,
} from '../../../types'
import { defu } from 'defu'
import { $fetch } from 'ofetch'
import { collectSitemap } from 'sitemapd/parse'
import { parseURL } from 'ufo'
import { getRequestHost } from '#nuxtseo/h3'
import { fetchWithEvent } from '#nuxtseo/nitro'
import { logger } from '../../../utils-pure'

const changeFrequencies = new Set<Changefreq>([
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
])

function readerEntryToSitemapInput(entry: SitemapUrlRecord): SitemapUrl {
  const priority = entry.priority === undefined ? undefined : Number.parseFloat(entry.priority)
  const changefreq = entry.changefreq && changeFrequencies.has(entry.changefreq as Changefreq)
    ? entry.changefreq as Changefreq
    : undefined
  return {
    loc: entry.loc,
    ...(entry.lastmod ? { lastmod: entry.lastmod } : {}),
    ...(changefreq ? { changefreq } : {}),
    ...(priority !== undefined && Number.isFinite(priority) ? { priority: priority as SitemapUrl['priority'] } : {}),
    ...(entry.extensions?.alternatives
      ? { alternatives: entry.extensions.alternatives.map(({ hreflang, href }) => ({ hreflang: hreflang!, href })) }
      : {}),
    ...(entry.extensions?.images
      ? {
          images: entry.extensions.images.map(image => ({
            loc: image.loc,
            ...(image.caption ? { caption: image.caption } : {}),
            ...(image.geoLocation ? { geo_location: image.geoLocation } : {}),
            ...(image.title ? { title: image.title } : {}),
            ...(image.license ? { license: image.license } : {}),
          })),
        }
      : {}),
    ...(entry.extensions?.videos ? { videos: entry.extensions.videos as unknown as SitemapUrl['videos'] } : {}),
    ...(entry.extensions?.news ? { news: entry.extensions.news as unknown as SitemapUrl['news'] } : {}),
  }
}

export function normalizeSourceInput(source: SitemapSourceInput): SitemapSourceBase | SitemapSourceResolved {
  // string -> { fetch: string, context: { name: 'hook' } }
  if (typeof source === 'string') {
    return { context: { name: 'hook' }, fetch: source }
  }
  // [string, FetchOptions] -> { fetch: [string, FetchOptions], context: { name: 'hook' } }
  if (Array.isArray(source)) {
    return { context: { name: 'hook' }, fetch: source }
  }
  return source
}

async function tryFetchWithFallback(url: string, options: any, event?: H3Event): Promise<any> {
  const isExternalUrl = !url.startsWith('/')
  // For external URLs, try different fetch strategies
  if (isExternalUrl) {
    const strategies = [
      // Strategy 1: Use globalThis.$fetch (original approach)
      () => globalThis.$fetch(url, options),
      // Strategy 2: If event is available, try using event context even for external URLs
      event ? () => fetchWithEvent(event, url, options) : null,
      // Strategy 3: Use native fetch as last resort
      () => $fetch(url, options),
    ].filter(Boolean)

    let lastError: Error | null = null
    for (const strategy of strategies) {
      try {
        return await strategy!()
      }
      catch (error) {
        lastError = error as Error
        continue
      }
    }
    throw lastError
  }

  // For internal URLs, use the original logic
  return event ? await fetchWithEvent(event, url, options) : await globalThis.$fetch(url, options)
}

export async function fetchDataSource(input: SitemapSourceBase | SitemapSourceResolved, event?: H3Event): Promise<SitemapSourceResolved> {
  const context = typeof input.context === 'string' ? { name: input.context } : input.context || { name: 'fetch' }
  const url = typeof input.fetch === 'string' ? input.fetch : input.fetch![0]
  const options = typeof input.fetch === 'string' ? {} : input.fetch![1]
  const start = Date.now()

  // Get external source configuration
  const isExternalUrl = !url.startsWith('/')

  // Use external source timeout if it's an external URL, otherwise use original timeout
  const timeout = isExternalUrl ? 10000 : (options.timeout || 5000)

  const timeoutController = new AbortController()
  const abortRequestTimeout = setTimeout(() => timeoutController.abort(), timeout)

  try {
    let isMaybeErrorResponse = false
    const pathname = parseURL(url).pathname.toLowerCase()
    // A `.gz` source (or a `.xml.gz` one) is still an XML sitemap once decompressed;
    // fetch it as bytes rather than assuming JSON.
    const isGzUrl = pathname.endsWith('.gz')
    const isXmlRequest = pathname.endsWith('.xml') || isGzUrl

    // Merge external source headers with request headers
    const mergedHeaders = defu(
      options?.headers,
      {
        Accept: isXmlRequest ? 'text/xml' : 'application/json',
      },
      (event && !isExternalUrl) ? { host: getRequestHost(event, { xForwardedHost: true }) } : {},
    )

    const fetchOptions = {
      ...options,
      // Fetch XML sources as raw bytes so we can detect and decompress a gzip body
      // (either a `.gz` URL, or a server that serves gzip without Content-Encoding)
      // before it's mangled by a UTF-8 text decode.
      responseType: isXmlRequest ? 'arrayBuffer' : 'json',
      signal: timeoutController.signal,
      headers: mergedHeaders,
      // Use ofetch's built-in retry for external sources
      ...(isExternalUrl && {
        retry: 2,
        retryDelay: 200,
      }),
      // @ts-expect-error untyped
      onResponse({ response }) {
        if (typeof response._data === 'string' && response._data.startsWith('<!DOCTYPE html>'))
          isMaybeErrorResponse = true
      },
    }

    const res = await tryFetchWithFallback(url, fetchOptions, event)

    const timeTakenMs = Date.now() - start
    if (isMaybeErrorResponse) {
      return {
        ...input,
        context,
        urls: [],
        timeTakenMs,
        error: 'Received HTML response instead of JSON',
      }
    }
    let urls = []
    if (isXmlRequest) {
      const bytes = res instanceof Uint8Array ? res : new Uint8Array(res as ArrayBuffer)
      const result = await collectSitemap(bytes)
      if (result._tag !== 'document')
        throw new Error(result.issues.map(issue => issue.message).join('; ') || 'Invalid sitemap document')
      if (result.document._tag !== 'urlset')
        throw new Error('Sitemap URL source must be a URL set, not a sitemap index')
      urls = result.document.entries.map(readerEntryToSitemapInput)
    }
    else if (typeof res === 'object') {
      urls = res.urls || res
    }
    return {
      ...input,
      context,
      timeTakenMs,
      urls: urls as SitemapUrlInput[],
    }
  }
  catch (_err) {
    const error = _err as FetchError

    // Enhanced error logging for external sources
    if (isExternalUrl) {
      const errorInfo = {
        url,
        timeout,
        error: error.message,
        statusCode: error.response?.status,
        statusText: error.response?.statusText,
        method: options?.method || 'GET',
      }

      logger.error('Failed to fetch external source.', errorInfo)
    }
    else {
      logger.error('Failed to fetch source.', { url, error: error.message })
    }

    return {
      ...input,
      context,
      urls: [],
      error: error.message,
      _isFailure: true, // Mark as failure to prevent caching
    }
  }
  finally {
    if (abortRequestTimeout) {
      clearTimeout(abortRequestTimeout)
    }
  }
}

export async function globalSitemapSources() {
  if (import.meta.prerender) {
    const { readSourcesFromFilesystem } = await import('#sitemap-virtual/read-sources.mjs')
    const sources = await readSourcesFromFilesystem('global-sources.json')
    if (sources) {
      // Spread to create a copy since the cached module returns a mutable reference
      return [...sources]
    }
  }
  const m = await import('#sitemap-virtual/global-sources.mjs')
  // Spread to create a copy since the cached module returns a mutable reference
  return [...m.sources]
}

export async function childSitemapSources(definition: ModuleRuntimeConfig['sitemaps'][string]) {
  // Runtime-registered sitemaps (sitemap:sitemaps-resolved hook) carry their sources inline;
  // static definitions have sources stripped at build time and live in the virtual module.
  if (definition?.sources?.length)
    return [...definition.sources]

  // Runtime definitions may provide urls directly, matching the `urls` config of static sitemaps
  if (definition?.urls) {
    const urls = typeof definition.urls === 'function' ? await definition.urls() : definition.urls
    return [{
      context: { name: `sitemaps:${definition.sitemapName}:urls`, description: 'Set with the sitemap definition `urls`.' },
      urls,
    }]
  }

  if (!definition?._hasSourceChunk)
    return []

  if (import.meta.prerender) {
    const { readSourcesFromFilesystem } = await import('#sitemap-virtual/read-sources.mjs')
    const allSources = await readSourcesFromFilesystem('child-sources.json')
    if (allSources) {
      // Spread to create a copy since the cached module returns a mutable reference
      return [...(allSources[definition.sitemapName] || [])]
    }
  }

  const m = await import('#sitemap-virtual/child-sources.mjs')
  // Spread to create a copy since the cached module returns a mutable reference
  return [...(m.sources[definition.sitemapName] || [])]
}

export async function resolveSitemapSources(sources: SitemapSourceInput[], event?: H3Event) {
  return await Promise.all(
    sources.map((source) => {
      const normalized = normalizeSourceInput(source)
      if ('urls' in normalized) {
        return <SitemapSourceResolved> {
          timeTakenMs: 0,
          ...normalized,
          urls: normalized.urls,
        }
      }
      if (normalized.fetch)
        return fetchDataSource(normalized, event)

      return <SitemapSourceResolved> {
        ...normalized,
        error: 'Invalid source',
      }
    }),
  )
}
