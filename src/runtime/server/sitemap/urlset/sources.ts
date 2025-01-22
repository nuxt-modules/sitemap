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
import { extractSitemapXML } from '../utils/extractSitemapXML'

export async function fetchDataSource(input: SitemapSourceBase | SitemapSourceResolved, event?: H3Event): Promise<SitemapSourceResolved> {
  const context = typeof input.context === 'string' ? { name: input.context } : input.context || { name: 'fetch' }
  context.tips = context.tips || []
  const url = typeof input.fetch === 'string' ? input.fetch : input.fetch![0]
  const options = typeof input.fetch === 'string' ? {} : input.fetch![1]
  const start = Date.now()

  // 5 seconds default to respond
  const timeout = options.timeout || 5000
  const timeoutController = new AbortController()
  const abortRequestTimeout = setTimeout(() => timeoutController.abort(), timeout)

  let isMaybeErrorResponse = false
  const isXmlRequest = parseURL(url).pathname.endsWith('.xml')
  const fetchContainer = (url.startsWith('/') && event) ? event : globalThis
  try {
    const res = await fetchContainer.$fetch(url, {
      ...options,
      responseType: isXmlRequest ? 'text' : 'json',
      signal: timeoutController.signal,
      headers: defu(options?.headers, {
        Accept: isXmlRequest ? 'text/xml' : 'application/json',
      }, event ? { host: getRequestHost(event, { xForwardedHost: true }) } : {}),
      // @ts-expect-error untyped
      onResponse({ response }) {
        if (typeof response._data === 'string' && response._data.startsWith('<!DOCTYPE html>'))
          isMaybeErrorResponse = true
      },
    })
    const timeTakenMs = Date.now() - start
    if (isMaybeErrorResponse) {
      context.tips.push('This is usually because the URL isn\'t correct or is throwing an error. Please check the URL')
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
      // fast pass XML extract all loc data, let's use
      urls = extractSitemapXML(res)
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
    if (error.message.includes('This operation was aborted'))
      context.tips.push('The request has taken too long. Make sure app sources respond within 5 seconds or adjust the timeout fetch option.')
    else
      context.tips.push(`Response returned a status of ${error.response?.status || 'unknown'}.`)

    console.error('[@nuxtjs/sitemap] Failed to fetch source.', { url, error })
    return {
      ...input,
      context,
      urls: [],
      error: error.message,
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
