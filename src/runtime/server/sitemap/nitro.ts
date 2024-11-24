import { getQuery, setHeader, createError } from 'h3'
import type { H3Event } from 'h3'
import { fixSlashes } from 'nuxt-site-config/urls'
import { defu } from 'defu'
import type {
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapDefinition,
  SitemapRenderCtx,
} from '../../types'
import { logger, mergeOnKey, splitForLocales } from '../../utils-pure'
import { createNitroRouteRuleMatcher } from '../kit'
import { buildSitemapUrls, urlsToXml } from './builder/sitemap'
import { normaliseEntry } from './urlset/normalise'
import { sortSitemapUrls } from './urlset/sort'
import { useNitroApp, createSitePathResolver, getPathRobotConfig, useSiteConfig } from '#imports'

export function useNitroUrlResolvers(e: H3Event): NitroUrlResolvers {
  const canonicalQuery = getQuery(e).canonical
  const isShowingCanonical = typeof canonicalQuery !== 'undefined' && canonicalQuery !== 'false'
  const siteConfig = useSiteConfig(e)
  return {
    event: e,
    fixSlashes: (path: string) => fixSlashes(siteConfig.trailingSlash, path),
    // we need these as they depend on the nitro event
    canonicalUrlResolver: createSitePathResolver(e, {
      canonical: isShowingCanonical || !import.meta.dev,
      absolute: true,
      withBase: true,
    }),
    relativeBaseUrlResolver: createSitePathResolver(e, { absolute: false, withBase: true }),
  }
}

export async function createSitemap(event: H3Event, definition: SitemapDefinition, runtimeConfig: ModuleRuntimeConfig) {
  const { sitemapName } = definition
  const nitro = useNitroApp()
  if (import.meta.prerender) {
    const config = useSiteConfig(event)
    if (!config.url && !nitro._sitemapWarned) {
      nitro._sitemapWarned = true
      logger.error('Sitemap Site URL missing!')
      logger.info('To fix this please add `{ site: { url: \'site.com\' } }` to your Nuxt config or a `NUXT_PUBLIC_SITE_URL=site.com` to your .env. Learn more at https://nuxtseo.com/site-config/getting-started/how-it-works')
      throw new createError({
        statusMessage: 'You must provide a site URL to prerender a sitemap.',
        statusCode: 500,
      })
    }
  }
  const resolvers = useNitroUrlResolvers(event)
  let sitemapUrls = await buildSitemapUrls(definition, resolvers, runtimeConfig)

  const routeRuleMatcher = createNitroRouteRuleMatcher()
  const { autoI18n } = runtimeConfig
  sitemapUrls = sitemapUrls.map((u) => {
    const path = u._path?.pathname || u.loc
    // blocked by @nuxtjs/robots (this is a polyfill if not installed)
    if (!getPathRobotConfig(event, { path, skipSiteIndexable: true }).indexable)
      return false
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
    // @ts-expect-error runtime types
    if (typeof routeRules.robots !== 'undefined' && !routeRules.robots) {
      return false
    }
    const hasRobotsDisabled = Object.entries(routeRules.headers || {})
      .some(([name, value]) => name.toLowerCase() === 'x-robots-tag' && value.toLowerCase().includes('noindex'))
    // check for redirects and headers which aren't indexable
    if (routeRules.redirect || hasRobotsDisabled)
      return false

    return routeRules.sitemap ? defu(u, routeRules.sitemap) as ResolvedSitemapUrl : u
  }).filter(Boolean)

  // 6. nitro hooks
  const resolvedCtx: SitemapRenderCtx = {
    urls: sitemapUrls,
    sitemapName: sitemapName,
  }
  await nitro.hooks.callHook('sitemap:resolved', resolvedCtx)

  const maybeSort = (urls: ResolvedSitemapUrl[]) => runtimeConfig.sortEntries ? sortSitemapUrls(urls) : urls
  // final urls
  const normalizedPreDedupe = resolvedCtx.urls.map(e => normaliseEntry(e, definition.defaults, resolvers))
  const urls = maybeSort(mergeOnKey(normalizedPreDedupe, '_key').map(e => normaliseEntry(e, definition.defaults, resolvers)))
  const sitemap = urlsToXml(urls, resolvers, runtimeConfig)

  const ctx = { sitemap, sitemapName }
  await nitro.hooks.callHook('sitemap:output', ctx)
  // need to clone the config object to make it writable
  setHeader(event, 'Content-Type', 'text/xml; charset=UTF-8')
  if (runtimeConfig.cacheMaxAgeSeconds)
    setHeader(event, 'Cache-Control', `public, max-age=${runtimeConfig.cacheMaxAgeSeconds}, must-revalidate`)
  else
    setHeader(event, 'Cache-Control', `no-cache, no-store`)
  event.context._isSitemap = true
  return ctx.sitemap
}
