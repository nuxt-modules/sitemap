import { getRequestHost } from 'h3'
import type { H3Event } from 'h3'
import type { FetchError } from 'ofetch'
import { defu } from 'defu'
import { parseURL } from 'ufo'
import type {
  ModuleRuntimeConfig,
  SitemapSourceBase,
  SitemapSourceResolved,
  SitemapUrlInput,
} from '../../../types'
import { logger } from '../../../utils-pure'

async function tryFetchWithFallback(url: string, options: any, event?: H3Event): Promise<any> {
  const isExternalUrl = !url.startsWith('/')
  // For external URLs, try different fetch strategies
  if (isExternalUrl) {
    const strategies = [
      // Strategy 1: Use globalThis.$fetch (original approach)
      () => globalThis.$fetch(url, options),
      // Strategy 2: If event is available, try using event context even for external URLs
      event ? () => event.$fetch(url, options) : null,
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
  const fetchContainer = (url.startsWith('/') && event) ? event : globalThis
  return await fetchContainer.$fetch(url, options)
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
    const isXmlRequest = parseURL(url).pathname.endsWith('.xml')

    // Merge external source headers with request headers
    const mergedHeaders = defu(
      options?.headers,
      {
        Accept: isXmlRequest ? 'text/xml' : 'application/json',
      },
      event ? { host: getRequestHost(event, { xForwardedHost: true }) } : {},
    )

    const fetchOptions = {
      ...options,
      responseType: isXmlRequest ? 'text' : 'json',
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
    if (typeof res === 'object') {
      urls = res.urls || res
    }
    else if (typeof res === 'string' && parseURL(url).pathname.endsWith('.xml')) {
      const { parseSitemapXml } = await import('@nuxtjs/sitemap/utils')
      const result = parseSitemapXml(res)
      urls = result.urls
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

export function globalSitemapSources() {
  return import('#sitemap-virtual/global-sources.mjs')
    .then(m => m.sources)
}

export function childSitemapSources(definition: ModuleRuntimeConfig['sitemaps'][string]) {
  return (
    definition?._hasSourceChunk
      ? import(`#sitemap-virtual/child-sources.mjs`)
          .then(m => m.sources[definition.sitemapName] || [])
      : Promise.resolve([])
  )
}

export async function resolveSitemapSources(sources: (SitemapSourceBase | SitemapSourceResolved)[], event?: H3Event) {
  return (await Promise.all(
    sources.map((source) => {
      if (typeof source === 'object' && 'urls' in source) {
        return <SitemapSourceResolved> {
          timeTakenMs: 0,
          ...source,
          urls: source.urls,
        }
      }
      if (source.fetch)
        return fetchDataSource(source, event)

      return <SitemapSourceResolved> {
        ...source,
        error: 'Invalid source',
      }
    }),
  )).flat()
}
