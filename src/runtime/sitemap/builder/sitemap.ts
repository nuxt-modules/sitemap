import { defu } from 'defu'
import { resolveSitePath } from 'site-config-stack'
import { parseURL, withHttps, withoutBase } from 'ufo'
import { createRouter as createRadixRouter, toRouteMatcher } from 'radix3'
import type { NitroRouteRules } from 'nitropack'
import type {
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapDefinition,
  SitemapRenderCtx,
} from '../../types'
import { normaliseSitemapUrls } from '../urlset/normalise'
import { childSitemapSources, globalSitemapSources, resolveSitemapSources } from '../urlset/sources'
import { filterSitemapUrls } from '../urlset/filter'
import { applyI18nEnhancements } from '../urlset/i18n'
import { sortSitemapUrls } from '../urlset/sort'
import { handleEntry, wrapSitemapXml } from './xml'
import { useNitroApp, useRuntimeConfig } from '#imports'

export async function buildSitemap(sitemap: SitemapDefinition, resolvers: NitroUrlResolvers) {
  const config = useRuntimeConfig()
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
    // sorting
    sortEntries,
    // chunking
    defaultSitemapsChunkSize,
    // xls
    version,
    xsl,
    credits,
  } = config['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig
  const isChunking = typeof sitemaps.chunks !== 'undefined' && !Number.isNaN(Number(sitemap.sitemapName))
  function maybeSort(urls: ResolvedSitemapUrl[]) {
    return sortEntries ? sortSitemapUrls(urls) : urls
  }
  function maybeSlice(urls: ResolvedSitemapUrl[]) {
    if (isChunking && defaultSitemapsChunkSize) {
      const chunk = Number(sitemap.sitemapName)
      return urls.slice(chunk * defaultSitemapsChunkSize, (chunk + 1) * defaultSitemapsChunkSize)
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
  const resolvedSources = await resolveSitemapSources(sources)
  // 1. normalise
  const normalisedUrls = normaliseSitemapUrls(resolvedSources.map(e => e.urls).flat(), resolvers)
  // 2. enhance
  const defaults = { ...(sitemap.defaults || {}) }
  if (autoLastmod && defaults?.lastmod)
    defaults.lastmod = new Date()
  // apply route rules
  const _routeRulesMatcher = toRouteMatcher(
    createRadixRouter({ routes: config.nitro?.routeRules }),
  )
  let enhancedUrls: ResolvedSitemapUrl[] = normalisedUrls
    // apply defaults
    .map(e => defu(e, sitemap.defaults) as ResolvedSitemapUrl)
    // apply route rules
    .map((e) => {
      const path = parseURL(e.loc).pathname
      let routeRules = defu({}, ..._routeRulesMatcher.matchAll(
        withoutBase(path.split('?')[0], useRuntimeConfig().app.baseURL),
      ).reverse()) as NitroRouteRules

      // apply top-level path without prefix, users can still target the localed path
      if (autoI18n?.locales && autoI18n?.strategy === 'no_prefix') {
        // remove the locale path from the prefix, if it exists, need to use regex
        const match = path.match(new RegExp(`^/(${autoI18n.locales.map(l => l.code).join('|')})(.*)`))
        const pathWithoutPrefix = match?.[2]
        if (pathWithoutPrefix && pathWithoutPrefix !== path) {
          routeRules = defu(routeRules, ..._routeRulesMatcher.matchAll(
            withoutBase(pathWithoutPrefix.split('?')[0], useRuntimeConfig().app.baseURL),
          ).reverse()) as NitroRouteRules
        }
      }

      if (routeRules.sitemap)
        return defu(e, routeRules.sitemap) as ResolvedSitemapUrl

      if (typeof routeRules.index !== 'undefined' && !routeRules.index)
        return false
      return e
    })
    .filter(Boolean) as ResolvedSitemapUrl[]
  // TODO enable
  if (autoI18n?.locales)
    enhancedUrls = applyI18nEnhancements(enhancedUrls, { isI18nMapped, autoI18n, sitemapName: sitemap.sitemapName })
  // 3. filtered urls
  // TODO make sure include and exclude start with baseURL?
  const filteredUrls = filterSitemapUrls(enhancedUrls, sitemap)
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
