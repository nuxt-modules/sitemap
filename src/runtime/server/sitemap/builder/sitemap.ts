import { resolveSitePath } from 'nuxt-site-config/urls'
import { joinURL, withHttps } from 'ufo'
import type { NitroApp } from 'nitropack/types'
import type {
  AlternativeEntry, AutoI18nConfig,
  ModuleRuntimeConfig,
  NitroUrlResolvers,
  ResolvedSitemapUrl,
  SitemapDefinition, SitemapInputCtx,
  SitemapUrl,
  SitemapUrlInput,
  SitemapSourcesHookCtx,
} from '../../../types'
import { preNormalizeEntry } from '../urlset/normalise'
import { childSitemapSources, globalSitemapSources, resolveSitemapSources } from '../urlset/sources'
import { sortInPlace } from '../urlset/sort'
import { applyDynamicParams, createPathFilter, findPageMapping, splitForLocales } from '../../../utils-pure'
import { parseChunkInfo, sliceUrlsForChunk } from '../utils/chunk'

export interface NormalizedI18n extends ResolvedSitemapUrl {
  _pathWithoutPrefix: string
  _locale: AutoI18nConfig['locales'][number]
  _index?: number
}

export function resolveSitemapEntries(sitemap: SitemapDefinition, urls: SitemapUrlInput[], runtimeConfig: Pick<ModuleRuntimeConfig, 'autoI18n' | 'isI18nMapped'>, resolvers?: NitroUrlResolvers): ResolvedSitemapUrl[] {
  const {
    autoI18n,
    isI18nMapped,
  } = runtimeConfig
  const filterPath = createPathFilter({
    include: sitemap.include,
    exclude: sitemap.exclude,
  })
  // 1. normalise
  const _urls = urls.map((_e) => {
    const e = preNormalizeEntry(_e, resolvers)
    if (!e.loc || !filterPath(e.loc))
      return false
    return e
  }).filter(Boolean) as ResolvedSitemapUrl[]

  let validI18nUrlsForTransform: NormalizedI18n[] = []
  const withoutPrefixPaths: Record<string, NormalizedI18n[]> = {}
  if (autoI18n && autoI18n.strategy !== 'no_prefix') {
    const localeCodes = autoI18n.locales.map(l => l.code)
    // Create locale lookup Map for O(1) access
    const localeByCode = new Map(autoI18n.locales.map(l => [l.code, l]))
    // Pre-check strategy once
    const isPrefixStrategy = autoI18n.strategy === 'prefix'
    const isPrefixExceptOrAndDefault = autoI18n.strategy === 'prefix_and_default' || autoI18n.strategy === 'prefix_except_default'
    // Pre-create x-default + locales array for alternatives
    const xDefaultAndLocales = [{ code: 'x-default', _hreflang: 'x-default' }, ...autoI18n.locales] as Array<{ code: string, _hreflang: string }>
    // Cache frequently accessed values
    const defaultLocale = autoI18n.defaultLocale
    const hasPages = !!autoI18n.pages
    const hasDifferentDomains = !!autoI18n.differentDomains

    validI18nUrlsForTransform = _urls.map((_e, i) => {
      if (_e._abs)
        return false
      const split = splitForLocales(_e._relativeLoc, localeCodes)
      let localeCode = split[0]
      const pathWithoutPrefix = split[1]
      if (!localeCode)
        localeCode = defaultLocale
      const e = _e as NormalizedI18n
      e._pathWithoutPrefix = pathWithoutPrefix
      // Use Map instead of find for O(1) lookup
      const locale = localeByCode.get(localeCode)
      if (!locale)
        return false
      e._locale = locale
      e._index = i
      e._key = `${e._sitemap || ''}${e._path?.pathname || '/'}${e._path?.search || ''}`
      withoutPrefixPaths[pathWithoutPrefix] = withoutPrefixPaths[pathWithoutPrefix] || []
      // need to make sure the locale doesn't already exist
      if (!withoutPrefixPaths[pathWithoutPrefix].some(e => e._locale.code === locale.code))
        withoutPrefixPaths[pathWithoutPrefix].push(e)
      return e
    }).filter(Boolean) as NormalizedI18n[]

    for (const e of validI18nUrlsForTransform) {
      // let's try and find other urls that we can use for alternatives
      if (!e._i18nTransform && !e.alternatives?.length) {
        const alternatives = (withoutPrefixPaths[e._pathWithoutPrefix] || [])
          .map((u) => {
            const entries: AlternativeEntry[] = []
            if (u._locale.code === defaultLocale) {
              entries.push({
                href: u.loc,
                hreflang: 'x-default',
              })
            }
            entries.push({
              href: u.loc,
              hreflang: u._locale._hreflang || defaultLocale,
            })
            return entries
          })
          .flat()
          .filter(Boolean) as AlternativeEntry[]
        if (alternatives.length)
          e.alternatives = alternatives
      }
      else if (e._i18nTransform) {
        delete e._i18nTransform
        // keep single entry, just add alternatvies
        if (hasDifferentDomains) {
          // Use Map instead of find with array creation
          const defLocale = localeByCode.get(defaultLocale)
          e.alternatives = [
            {
              ...defLocale,
              code: 'x-default',
            },
            ...autoI18n.locales
              .filter(l => !!l.domain),
          ]
            .map((locale) => {
              return {
                hreflang: locale._hreflang!,
                href: joinURL(withHttps(locale.domain!), e._pathWithoutPrefix),
              }
            })
        }
        else {
          // Find page mapping with support for dynamic routes
          const pageMatch = hasPages ? findPageMapping(e._pathWithoutPrefix, autoI18n.pages!) : null
          const pathSearch = e._path?.search || ''
          const pathWithoutPrefix = e._pathWithoutPrefix

          // need to add urls for all other locales
          for (const l of autoI18n.locales) {
            let loc = pathWithoutPrefix

            // Check if there's a custom mapping in i18n pages config
            if (pageMatch && pageMatch.mappings[l.code] !== undefined) {
              const customPath = pageMatch.mappings[l.code]
              // If customPath is false, skip this locale
              if (customPath === false)
                continue
              // If customPath is a string, use it (applying dynamic params if present)
              if (typeof customPath === 'string') {
                loc = customPath[0] === '/' ? customPath : `/${customPath}`
                loc = applyDynamicParams(loc, pageMatch.paramSegments)
                // Add locale prefix for non-default locales
                if (isPrefixStrategy || (isPrefixExceptOrAndDefault && l.code !== defaultLocale))
                  loc = joinURL(`/${l.code}`, loc)
              }
            }
            else if (!hasDifferentDomains && !(isPrefixExceptOrAndDefault && l.code === defaultLocale)) {
              // No custom mapping found, use default behavior
              loc = joinURL(`/${l.code}`, pathWithoutPrefix)
            }

            const _sitemap = isI18nMapped ? l._sitemap : undefined
            // Build alternatives array with loop instead of map().filter()
            const alternatives: AlternativeEntry[] = []
            for (const locale of xDefaultAndLocales) {
              const code = locale.code === 'x-default' ? defaultLocale : locale.code
              const isDefault = locale.code === 'x-default' || locale.code === defaultLocale
              let href = pathWithoutPrefix

              // Check for custom path mapping
              if (pageMatch && pageMatch.mappings[code] !== undefined) {
                const customPath = pageMatch.mappings[code]
                if (customPath === false)
                  continue
                if (typeof customPath === 'string') {
                  href = customPath[0] === '/' ? customPath : `/${customPath}`
                  href = applyDynamicParams(href, pageMatch.paramSegments)
                  // Add locale prefix for non-default locales
                  if (isPrefixStrategy || (isPrefixExceptOrAndDefault && !isDefault))
                    href = joinURL('/', code, href)
                }
              }
              else if (isPrefixStrategy) {
                href = joinURL('/', code, pathWithoutPrefix)
              }
              else if (isPrefixExceptOrAndDefault && !isDefault) {
                href = joinURL('/', code, pathWithoutPrefix)
              }

              if (!filterPath(href))
                continue
              alternatives.push({
                hreflang: locale._hreflang,
                href,
              })
            }

            const { _index: _, ...rest } = e
            const newEntry = preNormalizeEntry({
              _sitemap,
              ...rest,
              _key: `${_sitemap || ''}${loc || '/'}${pathSearch}`,
              _locale: l,
              loc,
              alternatives,
            } as SitemapUrl, resolvers) as NormalizedI18n
            if (e._locale.code === newEntry._locale.code) {
              // replace
              _urls[e._index!] = newEntry
              // avoid getting re-replaced
              e._index = undefined
            }
            else {
              _urls.push(newEntry)
            }
          }
        }
      }
      if (isI18nMapped) {
        e._sitemap = e._sitemap || e._locale._sitemap
        e._key = `${e._sitemap || ''}${e.loc || '/'}${e._path?.search || ''}`
      }
      if (e._index)
        _urls[e._index] = e
    }
  }
  return _urls
}

export async function buildSitemapUrls(sitemap: SitemapDefinition, resolvers: NitroUrlResolvers, runtimeConfig: ModuleRuntimeConfig, nitro?: NitroApp): Promise<{ urls: ResolvedSitemapUrl[], failedSources: Array<{ url: string, error: string }> }> {
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
    autoI18n,
    isI18nMapped,
    isMultiSitemap,
    // sorting
    sortEntries,
    // chunking
    defaultSitemapsChunkSize,
  } = runtimeConfig

  // Parse chunk information from the sitemap name
  const chunkSize = defaultSitemapsChunkSize || undefined
  const chunkInfo = parseChunkInfo(sitemap.sitemapName, sitemaps, chunkSize)

  function maybeSort(urls: ResolvedSitemapUrl[]) {
    return sortEntries ? sortInPlace(urls) : urls
  }

  function maybeSlice<T extends SitemapUrlInput[] | ResolvedSitemapUrl[]>(urls: T): T {
    return sliceUrlsForChunk(urls, sitemap.sitemapName, sitemaps, chunkSize) as T
  }
  if (autoI18n?.differentDomains) {
    const domain = autoI18n.locales.find(e => e.language === sitemap.sitemapName || e.code === sitemap.sitemapName)?.domain
    if (domain) {
      const _tester = resolvers.canonicalUrlResolver
      resolvers.canonicalUrlResolver = (path: string) => resolveSitePath(path, {
        absolute: true,
        withBase: false,
        siteUrl: withHttps(domain),
        trailingSlash: _tester('/test/').endsWith('/'),
        base: '/',
      })
    }
  }
  // 0. resolve sources
  // For chunked sitemaps, we need to use the base sitemap's sources
  let effectiveSitemap = sitemap
  const baseSitemapName = chunkInfo.baseSitemapName

  // If this is a chunked sitemap, use the base sitemap config for sources
  if (chunkInfo.isChunked && baseSitemapName !== sitemap.sitemapName && sitemaps[baseSitemapName]) {
    effectiveSitemap = sitemaps[baseSitemapName]
  }

  // always fetch all sitemap data for the primary sitemap
  // Note: globalSitemapSources() and childSitemapSources() return fresh copies
  let sourcesInput = effectiveSitemap.includeAppSources
    ? [...await globalSitemapSources(), ...await childSitemapSources(effectiveSitemap)]
    : await childSitemapSources(effectiveSitemap)

  // Allow hook to modify sources before resolution
  if (nitro && resolvers.event) {
    const ctx: SitemapSourcesHookCtx = {
      event: resolvers.event,
      sitemapName: baseSitemapName,
      sources: sourcesInput,
    }
    await nitro.hooks.callHook('sitemap:sources', ctx)
    sourcesInput = ctx.sources
  }

  const sources = await resolveSitemapSources(sourcesInput, resolvers.event)

  // Extract failed sources for display
  const failedSources = sources
    .filter(source => source.error && source._isFailure)
    .map(source => ({
      url: typeof source.fetch === 'string' ? source.fetch : (source.fetch?.[0] || 'unknown'),
      error: source.error || 'Unknown error',
    }))

  const resolvedCtx: SitemapInputCtx = {
    urls: sources.flatMap(s => s.urls),
    sitemapName: sitemap.sitemapName,
    event: resolvers.event,
  }
  await nitro?.hooks.callHook('sitemap:input', resolvedCtx)
  const enhancedUrls = resolveSitemapEntries(sitemap, resolvedCtx.urls, { autoI18n, isI18nMapped }, resolvers)
  // 3. filtered urls
  // TODO make sure include and exclude start with baseURL?
  const filteredUrls = enhancedUrls.filter((e) => {
    if (e._sitemap === false)
      return false
    if (isMultiSitemap && e._sitemap && sitemap.sitemapName) {
      if (sitemap._isChunking)
        return sitemap.sitemapName.startsWith(e._sitemap + '-')
      return e._sitemap === sitemap.sitemapName
    }
    return true
  })
  // 4. sort
  const sortedUrls = maybeSort(filteredUrls)
  // 5. maybe slice for chunked
  // if we're rendering a partial sitemap, slice the entries
  const urls = maybeSlice(sortedUrls)
  return { urls, failedSources }
}

export { urlsToXml } from './xml'
