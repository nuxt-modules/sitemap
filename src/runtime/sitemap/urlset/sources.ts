import type { FetchError } from 'ofetch'
import type {
  ModuleRuntimeConfig,
  SitemapSourceBase,
  SitemapSourceResolved,
  SitemapUrlInput,
} from '../../types'

export async function fetchDataSource(input: SitemapSourceBase | SitemapSourceResolved): Promise<SitemapSourceResolved> {
  input.context = input.context || 'fetch'
  const url = typeof input.fetch === 'string' ? input.fetch : input.fetch![0]
  const options = typeof input.fetch === 'string' ? {} : input.fetch![1]
  const start = Date.now()

  const timeoutController = new AbortController()
  const abortRequestTimeout = setTimeout(() => timeoutController.abort(), options.timeout)

  let isHtmlResponse = false
  try {
    const urls = await globalThis.$fetch(url, {
      responseType: 'json',
      signal: timeoutController.signal,
      headers: {
        Accept: 'application/json',
      },
      onResponse({ response }) {
        if (typeof response._data === 'string' && response._data.startsWith('<!DOCTYPE html>'))
          isHtmlResponse = true
      },
    })
    const timeTakenMs = Date.now() - start
    if (isHtmlResponse) {
      return {
        ...input,
        timeTakenMs,
        error: 'Received HTML response instead of JSON',
      }
    }
    return {
      ...input,
      timeTakenMs,
      urls: urls as SitemapUrlInput[],
    }
  }
  catch (err) {
    const error = (err as FetchError).message
    console.error('[nuxt-simple-sitemap] Failed to fetch source.', { url, error })
    return {
      ...input,
      error,
    }
  }
  finally {
    abortRequestTimeout && clearTimeout(abortRequestTimeout)
  }
}

export function globalSitemapSources(): Promise<(SitemapSourceBase | SitemapSourceResolved)[]> {
  // @ts-expect-error untyped
  return import('#nuxt-simple-sitemap/global-sources.mjs')
    .then(m => m.sources) as (SitemapSourceBase | SitemapSourceResolved)[]
}

export function childSitemapSources(definition: ModuleRuntimeConfig['sitemaps'][string]): Promise<(SitemapSourceBase | SitemapSourceResolved)[]> {
  return (
    definition?._hasSourceChunk
      // @ts-expect-error untyped
      ? import(`#nuxt-simple-sitemap/child-sources.mjs`)
        .then(m => m.sources[definition.sitemapName] || [])
      : Promise.resolve([])
  ) as Promise<(SitemapSourceBase | SitemapSourceResolved)[]>
}

export async function resolveSitemapSources(sources: (SitemapSourceBase | SitemapSourceResolved)[]) {
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
        return fetchDataSource(source)

      return <SitemapSourceResolved> {
        ...source,
        error: 'Invalid source',
      }
    }),
  )).flat()
}
