import { defu } from 'defu'
import { resolveSitePath } from 'site-config-stack/urls'
import { parseURL, withHttps } from 'ufo'
import type {
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapDefinition,
  SitemapRenderCtx,
  SitemapUrlInput,
} from '../../../types'
import { normaliseSitemapUrls } from '../urlset/normalise'
import { childSitemapSources, globalSitemapSources, resolveSitemapSources } from '../urlset/sources'
import { filterSitemapUrls } from '../urlset/filter'
import { applyI18nEnhancements, normaliseI18nSources } from '../urlset/i18n'
import { sortSitemapUrls } from '../urlset/sort'
import { splitForLocales } from '../../utils'
import { createNitroRouteRuleMatcher } from '../../kit'
import { handleEntry, wrapSitemapXml } from './xml'
import { useNitroApp } from '#imports'

export async function buildSitemap(sitemap: SitemapDefinition, resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig) {
  // 0. resolve sources
  // 1. normalise
  // 2. filter
  // 3. enhance
  // 4. sort
  // 5. chunking
  // 6. nitro hooks
  // 7. normalise and sort again
  const {
    sitemaps,
    // enhancing
    autoLastmod,
    autoI18n,
    isI18nMapped,
    isMultiSitemap,
    // sorting
    sortEntries,
    // chunking
    defaultSitemapsChunkSize,
    // xls
    version,
    xsl,
    credits,
  } = runtimeConfig
  const isChunking = typeof sitemaps.chunks !== 'undefined' && !Number.isNaN(Number(sitemap.sitemapName))
  function maybeSort(urls: ResolvedSitemapUrl[]) {
    return sortEntries ? sortSitemapUrls(urls) : urls
  }
  function maybeSlice<T extends SitemapUrlInput[] | ResolvedSitemapUrl[]>(urls: T): T {
    if (isChunking && defaultSitemapsChunkSize) {
      const chunk = Number(sitemap.sitemapName)
      return urls.slice(chunk * defaultSitemapsChunkSize, (chunk + 1) * defaultSitemapsChunkSize) as T
    }
    return urls
  }
  if (autoI18n?.differentDomains) {
    const domain = autoI18n.locales.find(e => [e.iso, e.code].includes(sitemap.sitemapName))?.domain
    if (domain) {
      const _tester = resolvers.canonicalUrlResolver
      resolvers.canonicalUrlResolver = (path: string) => resolveSitePath(path, {
        absolute: true,
        withBase: false,
        siteUrl: withHttps(domain),
        trailingSlash: !_tester('/test/').endsWith('/'),
        base: '/',
      })
    }
  }
  // 0. resolve sources
  // always fetch all sitemap data for the primary sitemap
  const sources = sitemap.includeAppSources ? await globalSitemapSources() : []
  sources.push(...await childSitemapSources(sitemap))
  let resolvedSources = await resolveSitemapSources(sources)
  // normalise the sources for i18n
  if (autoI18n)
    resolvedSources = normaliseI18nSources(resolvedSources, { autoI18n, isI18nMapped })
  // 1. normalise
  const normalisedUrls = normaliseSitemapUrls(resolvedSources.map(e => e.urls).flat(), resolvers)
  // 2. enhance
  const defaults = { ...(sitemap.defaults || {}) }
  if (autoLastmod && defaults?.lastmod)
    defaults.lastmod = new Date()

  const routeRuleMatcher = createNitroRouteRuleMatcher()
  let enhancedUrls: ResolvedSitemapUrl[] = normalisedUrls
    // apply defaults
    .map(e => defu(e, sitemap.defaults) as ResolvedSitemapUrl)
    // apply route rules
    .map((e) => {
      const path = parseURL(e.loc).pathname
      let routeRules = routeRuleMatcher(path)
      // apply top-level path without prefix, users can still target the localed path
      if (autoI18n?.locales && autoI18n?.strategy !== 'no_prefix') {
        // remove the locale path from the prefix, if it exists, need to use regex
        const match = splitForLocales(path, autoI18n.locales.map(l => l.code))
        const pathWithoutPrefix = match[1]
        if (pathWithoutPrefix && pathWithoutPrefix !== path)
          routeRules = defu(routeRules, routeRuleMatcher(pathWithoutPrefix))
      }

      if (routeRules.sitemap === false)
        return false
      if (typeof routeRules.index !== 'undefined' && !routeRules.index)
        return false
      const hasRobotsDisabled = Object.entries(routeRules.headers || {})
        .some(([name, value]) => name.toLowerCase() === 'x-robots-tag' && value.toLowerCase() === 'noindex')
      // check for redirects and headers which aren't indexable
      if (routeRules.redirect || hasRobotsDisabled)
        return false

      return routeRules.sitemap ? defu(e, routeRules.sitemap) as ResolvedSitemapUrl : e
    })
    .filter(Boolean) as ResolvedSitemapUrl[]
  // TODO enable
  if (autoI18n?.locales)
    enhancedUrls = applyI18nEnhancements(enhancedUrls, { isI18nMapped, autoI18n, sitemapName: sitemap.sitemapName })
  // 3. filtered urls
  // TODO make sure include and exclude start with baseURL?
  const filteredUrls = filterSitemapUrls(enhancedUrls, { event: resolvers.event, isMultiSitemap, autoI18n, ...sitemap })
  // 4. sort
  const sortedUrls = maybeSort(filteredUrls)
  // 5. maybe slice for chunked
  // if we're rendering a partial sitemap, slice the entries
  const slicedUrls = maybeSlice(sortedUrls)
  // 6. nitro hooks
  const nitro = useNitroApp()
  const ctx: SitemapRenderCtx = {
    urls: slicedUrls,
    sitemapName: sitemap.sitemapName,
  }
  await nitro.hooks.callHook('sitemap:resolved', ctx)

  // final urls
  const urls = maybeSort(normaliseSitemapUrls(ctx.urls, resolvers))

  const urlset = urls.map((e) => {
    const keys = Object.keys(e).filter(k => !k.startsWith('_'))
    return [
      '    <url>',
      keys.map(k => handleEntry(k, e)).filter(Boolean).join('\n'),
      '    </url>',
    ].join('\n')
  })
  return wrapSitemapXml([
    '<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlset.join('\n'),
    '</urlset>',
  ], resolvers, { version, xsl, credits })
}
