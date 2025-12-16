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
import { createPathFilter, splitForLocales } from '../../../utils-pure'
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
    validI18nUrlsForTransform = _urls.map((_e, i) => {
      if (_e._abs)
        return false
      const split = splitForLocales(_e._relativeLoc, localeCodes)
      let localeCode = split[0]
      const pathWithoutPrefix = split[1]
      if (!localeCode)
        localeCode = autoI18n.defaultLocale
      const e = _e as NormalizedI18n
      e._pathWithoutPrefix = pathWithoutPrefix
      const locale = autoI18n.locales.find(l => l.code === localeCode)!
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
            if (u._locale.code === autoI18n.defaultLocale) {
              entries.push({
                href: u.loc,
                hreflang: 'x-default',
              })
            }
            entries.push({
              href: u.loc,
              hreflang: u._locale._hreflang || autoI18n.defaultLocale,
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
        if (autoI18n.differentDomains) {
          e.alternatives = [
            {
              // apply default locale domain
              ...autoI18n.locales.find(l => [l.code, l.language].includes(autoI18n.defaultLocale)),
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
          // need to add urls for all other locales
          for (const l of autoI18n.locales) {
            let loc = e._pathWithoutPrefix

            // Check if there's a custom mapping in i18n pages config
            if (autoI18n.pages) {
              // Remove leading slash and /index suffix for page key lookup
              const pageKey = e._pathWithoutPrefix.replace(/^\//, '').replace(/\/index$/, '') || 'index'
              const pageMappings = autoI18n.pages[pageKey]

              if (pageMappings && pageMappings[l.code] !== undefined) {
                const customPath = pageMappings[l.code]
                // If customPath is false, skip this locale
                if (customPath === false)
                  continue
                // If customPath is a string, use it
                if (typeof customPath === 'string')
                  loc = customPath.startsWith('/') ? customPath : `/${customPath}`
              }
              else if (!autoI18n.differentDomains && !(['prefix_and_default', 'prefix_except_default'].includes(autoI18n.strategy) && l.code === autoI18n.defaultLocale)) {
                // No custom mapping found, use default behavior
                loc = joinURL(`/${l.code}`, e._pathWithoutPrefix)
              }
            }
            else {
              // No pages config, use original behavior
              if (!autoI18n.differentDomains && !(['prefix_and_default', 'prefix_except_default'].includes(autoI18n.strategy) && l.code === autoI18n.defaultLocale))
                loc = joinURL(`/${l.code}`, e._pathWithoutPrefix)
            }

            const _sitemap = isI18nMapped ? l._sitemap : undefined
            const { _index: _, ...rest } = e
            const newEntry = preNormalizeEntry({
              _sitemap,
              ...rest,
              _key: `${_sitemap || ''}${loc || '/'}${e._path?.search || ''}`,
              _locale: l,
              loc,
              alternatives: ([{ code: 'x-default', _hreflang: 'x-default' }, ...autoI18n.locales] as Array<{ code: string, _hreflang: string }>).map((locale) => {
                const code = locale.code === 'x-default' ? autoI18n.defaultLocale : locale.code
                const isDefault = locale.code === 'x-default' || locale.code === autoI18n.defaultLocale
                let href = e._pathWithoutPrefix

                // Check for custom path mapping
                if (autoI18n.pages) {
                  const pageKey = e._pathWithoutPrefix.replace(/^\//, '').replace(/\/index$/, '') || 'index'
                  const pageMappings = autoI18n.pages[pageKey]

                  if (pageMappings && pageMappings[code] !== undefined) {
                    const customPath = pageMappings[code]
                    if (customPath === false)
                      return false
                    if (typeof customPath === 'string')
                      href = customPath.startsWith('/') ? customPath : `/${customPath}`
                  }
                  else if (autoI18n.strategy === 'prefix') {
                    href = joinURL('/', code, e._pathWithoutPrefix)
                  }
                  else if (['prefix_and_default', 'prefix_except_default'].includes(autoI18n.strategy)) {
                    if (!isDefault) {
                      href = joinURL('/', code, e._pathWithoutPrefix)
                    }
                  }
                }
                else {
                  // Original behavior without pages config
                  if (autoI18n.strategy === 'prefix') {
                    href = joinURL('/', code, e._pathWithoutPrefix)
                  }
                  else if (['prefix_and_default', 'prefix_except_default'].includes(autoI18n.strategy)) {
                    if (!isDefault) {
                      href = joinURL('/', code, e._pathWithoutPrefix)
                    }
                  }
                }

                if (!filterPath(href))
                  return false
                return {
                  hreflang: locale._hreflang,
                  href,
                }
              }).filter(Boolean) as AlternativeEntry[],
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
    const domain = autoI18n.locales.find(e => [e.language, e.code].includes(sitemap.sitemapName))?.domain
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
  let sourcesInput = effectiveSitemap.includeAppSources ? await globalSitemapSources() : []
  sourcesInput.push(...await childSitemapSources(effectiveSitemap))

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
