import type { BuildSitemapIndexInput, BuildSitemapInput, DataSourceResult, SitemapEntryInput, SitemapRoot } from '../../types'

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

  if (input.extraRoutes.prerenderUrls.length) {
    entries.push({
      context: 'nuxt-config.nitro-prerender',
      urls: input.extraRoutes.prerenderUrls,
    })
  }

  if (input.extraRoutes.routeRules.length) {
    entries.push({
      context: 'nuxt-config.route-rules',
      urls: input.extraRoutes.routeRules,
    })
  }

  entries.push({
    context: 'nuxt-config.module',
    path: 'urls',
    urls: await resolveUrls(input.moduleConfig.urls),
  })

  function doFetch(url: string, timeout = 8000) {
    const context = 'api'
    const start = Date.now()

    const timeoutController = new AbortController()
    const abortRequestTimeout = setTimeout(() => timeoutController.abort(), timeout)

    let isHtmlResponse = false
    return globalThis.$fetch(url, {
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
      .then((urls) => {
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
            urls: urls as SitemapEntryInput[],
          })
        }
      })
      .catch((err) => {
        entries.push({
          context,
          urls: [],
          path: url,
          error: err,
        })
      })
      .finally(() => {
        abortRequestTimeout && clearTimeout(abortRequestTimeout)
      })
  }

  const waitables: Promise<void>[] = []

  async function loadSitemapSources(sitemap: SitemapRoot) {
    if (sitemap.urls) {
      entries.push({
        context: 'nuxt-config.module',
        path: `sitemaps.${sitemap.sitemapName}.urls`,
        urls: await resolveUrls(sitemap.urls),
      })
    }
    if (sitemap.dynamicUrlsApiEndpoint)
      waitables.push(doFetch(sitemap.dynamicUrlsApiEndpoint))
  }

  if (input.buildTimeMeta.hasApiRoutesUrl)
    waitables.push(doFetch(input.moduleConfig.dynamicUrlsApiEndpoint))

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
    waitables.push(doFetch(input.canonicalUrlResolver('/__sitemap__/routes.json'), 1500))

  if (isNuxtContentDocumentDriven)
    waitables.push(doFetch('/api/__sitemap__/document-driven-urls', 4000))

  // allow requests to be made in parallel
  await Promise.all(waitables)
  return entries
}
