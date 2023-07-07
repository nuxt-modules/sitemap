import type { BuildSitemapIndexInput, BuildSitemapInput, DataSourceResult, SitemapEntry, SitemapRoot } from '../../types'

async function resolveUrls(urls: SitemapRoot['urls']) {
  if (typeof urls === 'function')
    urls = urls()
  // resolve promise
  urls = await urls
  return urls
}

export async function resolveAsyncDataSources(input: BuildSitemapInput | BuildSitemapIndexInput) {
  const { hasPrerenderedRoutesPayload, isNuxtContentDocumentDriven } = input.buildTimeMeta
  const entries: DataSourceResult[] = []
  entries.push({
    context: 'pages',
    urls: input.pages,
  })
  if (input.prerenderUrls) {
    entries.push({
      context: 'prerender',
      urls: input.prerenderUrls,
    })
  }

  entries.push({
    context: 'nuxt-config',
    path: 'urls',
    urls: await resolveUrls(input.moduleConfig.urls),
  })

  function doFetch(url: string) {
    const context = 'api'
    const start = Date.now()
    let isHtmlResponse = false
    return globalThis.$fetch(url, {
      responseType: 'json',
      headers: {
        Accept: 'application/json',
      },
      onResponse({ response }) {
        if (typeof response._data === 'string' && response._data.startsWith('<!DOCTYPE html>'))
          isHtmlResponse = true
      },
    }).then((urls) => {
      const timeTakenMs = Date.now() - start
      if (isHtmlResponse) {
        entries.push({
          context,
          timeTakenMs,
          urls: [],
          path: url,
          error: 'Received HTML response instead of JSON',
        })
      }
      else {
        entries.push({
          context,
          timeTakenMs,
          path: url,
          urls: urls as SitemapEntry[],
        })
      }
    }).catch((err) => {
      entries.push({
        context,
        urls: [],
        path: url,
        error: err,
      })
    })
  }

  const waitables: Promise<void>[] = []

  async function loadSitemapSources(sitemap: SitemapRoot) {
    if (sitemap.urls) {
      entries.push({
        context: 'nuxt-config',
        path: `sitemaps.${sitemap.sitemapName}.urls`,
        urls: await resolveUrls(sitemap.urls),
      })
    }
    if (sitemap.dynamicUrlsApiEndpoint)
      waitables.push(doFetch(sitemap.dynamicUrlsApiEndpoint))
  }

  if (input.buildTimeMeta.hasApiRoutesUrl)
    doFetch(input.moduleConfig.dynamicUrlsApiEndpoint)

  // if sitemap is empty, we use all sources (sitemaps.dynamicUrlsApiEndpoint and moduleConfig.dynamicUrlsApiEndpoint)
  // sitemap_index & debug
  if (!input.sitemap && typeof input.moduleConfig.sitemaps === 'object') {
    // load the urls from the sub sitemaps
    for (const entry of Object.entries(input.moduleConfig.sitemaps)) {
      const [sitemapName, sitemap] = entry
      await loadSitemapSources({
        sitemapName,
        ...sitemap,
      })
    }
  }
  else if (input.sitemap) {
    await loadSitemapSources(input.sitemap)
  }

  // for SSR we inject a payload of the routes which we can later read from
  if (hasPrerenderedRoutesPayload)
    waitables.push(doFetch(input.nitroUrlResolver('/__sitemap__/routes.json')))

  if (isNuxtContentDocumentDriven)
    waitables.push(doFetch('/api/__sitemap__/document-driven-urls'))

  // allow requests to be made in parallel
  await Promise.all(waitables)
  return entries
}
