import type { BuildSitemapIndexInput, BuildSitemapInput, SitemapDataSource, SitemapEntry } from '../../types'

export async function resolveAsyncSitemapData(input: BuildSitemapInput | BuildSitemapIndexInput) {
  const { hasPrerenderedRoutesPayload, isNuxtContentDocumentDriven, hasApiRoutesUrl } = input.buildTimeMeta
  const entries: SitemapDataSource[] = []
  entries.push({
    context: 'pages',
    urls: input.pages,
  })
  if (input.prerenderUrls) {
    entries.push({
      context: 'prerender-urls',
      urls: input.prerenderUrls,
    })
  }
  if (input.sitemap) {
    entries.push({
      context: 'config:sitemaps.urls',
      urls: input.sitemap.urls,
    })
  }
  entries.push({
    context: 'config:urls',
    urls: input.moduleConfig.urls,
  })
  const waitables: Promise<void>[] = []

  // dynamic endpoint
  if (hasApiRoutesUrl) {
    waitables.push(
      //  should just work
      globalThis.$fetch(input.moduleConfig.dynamicUrlsApiEndpoint, {
        responseType: 'json',
      }).then((urls) => {
        entries.push({
          context: `route:${input.moduleConfig.dynamicUrlsApiEndpoint.replaceAll('/', '.')}`,
          urls: urls as SitemapEntry[],
        })
      }),
    )
  }

  if (input.sitemap?.dynamicUrlsApiEndpoint) {
    waitables.push(
      //  should just work
      globalThis.$fetch(input.moduleConfig.dynamicUrlsApiEndpoint, {
        responseType: 'json',
      }).then((urls) => {
        entries.push({
          context: `sitemap:${input.sitemap!.sitemapName}:${input.moduleConfig.dynamicUrlsApiEndpoint.replaceAll('/', '.')}`,
          urls: urls as SitemapEntry[],
        })
      }),
    )
  }

  // for SSR we inject a payload of the routes which we can later read from
  if (hasPrerenderedRoutesPayload) {
    let isHtmlResponse = false
    waitables.push(
      // needs some magic to work
      // @todo use nitro origin
      globalThis.$fetch(input.nitroUrlResolver('/__sitemap__/routes.json'), {
        responseType: 'json',
        headers: {
          Accept: 'application/json',
        },
        onResponse({ response }) {
          if (typeof response._data === 'string' && response._data.startsWith('<!DOCTYPE html>'))
            isHtmlResponse = true
        },
      }).then((routes) => {
        entries.push({
          context: 'file:__sitemap__.routes.json',
          urls: (!isHtmlResponse ? routes as SitemapEntry[] : []),
        })
      }),
    )
  }

  if (isNuxtContentDocumentDriven) {
    waitables.push(
      // should just work
      globalThis.$fetch('/api/__sitemap__/document-driven-urls', {
        responseType: 'json',
      }).then((urls) => {
        entries.push({
          context: 'api:document-driven-urls\'',
          urls: urls as SitemapEntry[],
        })
      }),
    )
  }

  // allow requests to be made in parallel
  await Promise.all(waitables)
  return entries
}
