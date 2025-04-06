import {
  addPrerenderRoutes,
  addServerHandler,
  addServerImports,
  addServerPlugin,
  createResolver,
  defineNuxtModule,
  getNuxtModuleVersion,
  hasNuxtModule,
  hasNuxtModuleCompatibility, resolveModule,
  useLogger,
} from '@nuxt/kit'
import { joinURL, withBase, withLeadingSlash, withoutLeadingSlash, withoutTrailingSlash, withTrailingSlash } from 'ufo'
import { installNuxtSiteConfig } from 'nuxt-site-config/kit'
import { defu } from 'defu'
import type { NitroRouteConfig } from 'nitropack'
import { readPackageJSON } from 'pkg-types'
import { dirname } from 'pathe'
import type { FileAfterParseHook } from '@nuxt/content'
import type {
  AppSourceContext,
  AutoI18nConfig,
  ModuleRuntimeConfig,
  MultiSitemapEntry,
  SitemapDefinition,
  SitemapSourceBase,
  SitemapSourceInput,
  SitemapSourceResolved,
  ModuleOptions as _ModuleOptions, FilterInput, I18nIntegrationOptions, SitemapUrl,
} from './runtime/types'
import { convertNuxtPagesToSitemapEntries, generateExtraRoutesFromNuxtConfig, resolveUrls } from './util/nuxtSitemap'
import { createNitroPromise, createPagesPromise, extendTypes, getNuxtModuleOptions, resolveNitroPreset } from './util/kit'
import { includesSitemapRoot, isNuxtGenerate, setupPrerenderHandler } from './prerender'
import { setupDevToolsUI } from './devtools'
import { normaliseDate } from './runtime/server/sitemap/urlset/normalise'
import {
  generatePathForI18nPages,
  normalizeLocales,
  splitPathForI18nLocales,
} from './util/i18n'
import { normalizeFilters } from './util/filter'

export type * from './runtime/types'

// eslint-disable-next-line
export interface ModuleOptions extends _ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@nuxtjs/sitemap',
    compatibility: {
      nuxt: '>=3.9.0',
      bridge: false,
    },
    configKey: 'sitemap',
  },
  defaults: {
    enabled: true,
    credits: true,
    cacheMaxAgeSeconds: 60 * 10, // cache for 10 minutes
    minify: false,
    debug: false,
    defaultSitemapsChunkSize: 1000,
    autoLastmod: false,
    discoverImages: true,
    discoverVideos: true,
    urls: [],
    sortEntries: true,
    sitemapsPathPrefix: '/__sitemap__/',
    xsl: '/__sitemap__/style.xsl',
    xslTips: true,
    strictNuxtContentPaths: false,
    runtimeCacheStorage: true,
    sitemapName: 'sitemap.xml',
    // cacheControlHeader: 'max-age=600, must-revalidate',
    defaults: {},
    // index sitemap options filtering
    include: [],
    exclude: ['/_**'],
    // sources
    sources: [],
    excludeAppSources: [],
  },
  async setup(config, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const { name, version } = await readPackageJSON(resolve('../package.json'))
    const logger = useLogger(name)
    logger.level = (config.debug || nuxt.options.debug) ? 4 : 3
    if (config.enabled === false) {
      logger.debug('The module is disabled, skipping setup.')
      return
    }
    // /_nuxt/
    config.exclude!.push(`${withTrailingSlash(nuxt.options.app.buildAssetsDir)}**`)
    nuxt.options.alias['#sitemap'] = resolve('./runtime')
    nuxt.options.nitro.alias = nuxt.options.nitro.alias || {}
    nuxt.options.nitro.alias['#sitemap'] = resolve('./runtime')
    config.xslColumns = config.xslColumns || [
      { label: 'URL', width: '50%' },
      { label: 'Images', width: '25%', select: 'count(image:image)' },
      {
        label: 'Last Updated',
        width: '25%',
        select: 'concat(substring(sitemap:lastmod,0,11),concat(\' \', substring(sitemap:lastmod,12,5)),concat(\' \', substring(sitemap:lastmod,20,6)))',
      },
    ]

    if (config.autoLastmod) {
      config.defaults = config.defaults || {}
      config.defaults.lastmod = normaliseDate(new Date())
    }

    // warn about bad config
    const normalizedSitemaps = typeof config.sitemaps === 'boolean' ? {} : config.sitemaps || {}
    if (!nuxt.options._prepare && Object.keys(normalizedSitemaps).length) {
      // if the only key of config.sitemaps is `index` then we can skip this logic
      const isSitemapIndexOnly = typeof normalizedSitemaps?.index !== 'undefined' && Object.keys(normalizedSitemaps).length === 1
      if (!isSitemapIndexOnly) {
        // if the user is doing multi-sitempas using the sitemaps config, we warn when root keys are used as they won't do anything
        const warnForIgnoredKey = (key: string) => {
          logger.warn(`You are using multiple-sitemaps but have provided \`sitemap.${key}\` in your Nuxt config. This will be ignored, please move it to the child sitemap config.`)
          logger.warn('Learn more at: https://nuxtseo.com/sitemap/guides/multi-sitemaps')
        }

        switch (true) {
          case (config?.sources?.length || 0) > 0:
            warnForIgnoredKey('sources')
            break
          case config?.includeAppSources !== undefined:
            warnForIgnoredKey('includeAppSources')
            break
        }
      }
    }

    // for trailing slashes / canonical absolute urls
    await installNuxtSiteConfig()
    const userGlobalSources: SitemapSourceInput[] = [
      ...config.sources || [],
    ]
    const appGlobalSources: (SitemapSourceBase | SitemapSourceResolved)[] = []

    nuxt.options.nitro.storage = nuxt.options.nitro.storage || {}
    // provide cache storage for prerendering
    if (config.runtimeCacheStorage && !nuxt.options.dev && typeof config.runtimeCacheStorage === 'object')
      nuxt.options.nitro.storage.sitemap = config.runtimeCacheStorage

    if (!config.sitemapName.endsWith('xml')) {
      const newName = `${config.sitemapName.split('.')[0]}.xml`
      logger.warn(`You have provided a \`sitemapName\` that does not end with \`.xml\`. This is not supported by search engines, renaming to \`${newName}\`.`)
      config.sitemapName = newName
    }
    config.sitemapName = withoutLeadingSlash(config.sitemapName)

    let usingMultiSitemaps = !!config.sitemaps

    let isI18nMapped = false
    let nuxtI18nConfig = {} as I18nIntegrationOptions
    let resolvedAutoI18n: false | AutoI18nConfig = typeof config.autoI18n === 'boolean' ? false : config.autoI18n || false
    const hasDisabledAutoI18n = typeof config.autoI18n === 'boolean' && !config.autoI18n
    let normalisedLocales: AutoI18nConfig['locales'] = []
    let usingI18nPages = false
    const i18nModule = ['@nuxtjs/i18n', 'nuxt-i18n-micro'].find(s => hasNuxtModule(s))
    if (i18nModule) {
      const i18nVersion = await getNuxtModuleVersion(i18nModule)
      if (i18nVersion && i18nModule === '@nuxtjs/i18n' && !await hasNuxtModuleCompatibility(i18nModule, '>=8'))
        logger.warn(`You are using ${i18nModule} v${i18nVersion}. For the best compatibility, please upgrade to ${i18nModule} v8.0.0 or higher.`)
      nuxtI18nConfig = (await getNuxtModuleOptions(i18nModule) || {}) as I18nIntegrationOptions
      if (typeof nuxtI18nConfig.includeDefaultLocaleRoute !== 'undefined') {
        nuxtI18nConfig.strategy = nuxtI18nConfig.includeDefaultLocaleRoute ? 'prefix' : 'prefix_except_default'
      }
      normalisedLocales = normalizeLocales(nuxtI18nConfig)
      usingI18nPages = !!Object.keys(nuxtI18nConfig.pages || {}).length
      if (usingI18nPages && !hasDisabledAutoI18n) {
        const i18nPagesSources: SitemapSourceBase = {
          context: {
            name: `${i18nModule}:pages`,
            description: 'Generated from your i18n.pages config.',
            tips: [
              'You can disable this with `autoI18n: false`.',
            ],
          },
          urls: [],
        }
        for (const pageLocales of Object.values(nuxtI18nConfig?.pages as Record<string, Record<string, string>>)) {
          for (const localeCode in pageLocales) {
            const locale = normalisedLocales.find(l => l.code === localeCode)
            // add root entry for default locale and ignore dynamic routes
            if (!locale || !pageLocales[localeCode] || pageLocales[localeCode].includes('['))
              continue

            // add to sitemap
            const alternatives = Object.keys(pageLocales)
              .map(l => ({
                hreflang: normalisedLocales.find(nl => nl.code === l)?._hreflang || l,
                href: generatePathForI18nPages({ localeCode: l, pageLocales: pageLocales[l], nuxtI18nConfig, normalisedLocales }),
              }))
            if (alternatives.length && nuxtI18nConfig.defaultLocale && pageLocales[nuxtI18nConfig.defaultLocale])
              alternatives.push({ hreflang: 'x-default', href: generatePathForI18nPages({ normalisedLocales, localeCode: nuxtI18nConfig.defaultLocale, pageLocales: pageLocales[nuxtI18nConfig.defaultLocale], nuxtI18nConfig }) })
            i18nPagesSources.urls!.push({
              _sitemap: locale._sitemap,
              loc: generatePathForI18nPages({ normalisedLocales, localeCode, pageLocales: pageLocales[localeCode], nuxtI18nConfig }),
              alternatives,
            })
            // add extra loc with the default locale code prefix on prefix and default strategy
            if (nuxtI18nConfig.strategy === 'prefix_and_default' && localeCode === nuxtI18nConfig.defaultLocale) {
              i18nPagesSources.urls!.push({
                _sitemap: locale._sitemap,
                loc: generatePathForI18nPages({ normalisedLocales, localeCode, pageLocales: pageLocales[localeCode], nuxtI18nConfig, forcedStrategy: 'prefix' }),
                alternatives,
              })
            }
          }
        }
        appGlobalSources.push(i18nPagesSources)
        // pages will be wrong
        if (Array.isArray(config.excludeAppSources))
          config.excludeAppSources.push('nuxt:pages')
      }
      else {
        if (!normalisedLocales.length)
          logger.warn(`You are using ${i18nModule} but have not configured any locales, this will cause issues with ${name}. Please configure \`locales\`.`)
      }
      const hasSetAutoI18n = typeof config.autoI18n === 'object' && Object.keys(config.autoI18n).length
      const hasI18nConfigForAlternatives = nuxtI18nConfig.differentDomains || usingI18nPages || (nuxtI18nConfig.strategy !== 'no_prefix' && nuxtI18nConfig.locales)
      if (!hasSetAutoI18n && !hasDisabledAutoI18n && hasI18nConfigForAlternatives) {
        resolvedAutoI18n = {
          differentDomains: nuxtI18nConfig.differentDomains,
          defaultLocale: nuxtI18nConfig.defaultLocale!,
          locales: normalisedLocales,
          strategy: nuxtI18nConfig.strategy as 'prefix' | 'prefix_except_default' | 'prefix_and_default',
        }
      }
      let canI18nMap = config.sitemaps !== false && nuxtI18nConfig.strategy !== 'no_prefix'
      if (typeof config.sitemaps === 'object') {
        const isSitemapIndexOnly = typeof config.sitemaps.index !== 'undefined' && Object.keys(config.sitemaps).length === 1
        if (!isSitemapIndexOnly)
          canI18nMap = false
      }
      // if they haven't set `sitemaps` explicitly then we can set it up automatically for them
      if (canI18nMap && resolvedAutoI18n) {
        // @ts-expect-error untyped
        config.sitemaps = { index: [...(config.sitemaps?.index || []), ...(config.appendSitemaps || [])] }
        for (const locale of resolvedAutoI18n.locales)
          // @ts-expect-error untyped
          config.sitemaps[locale._sitemap] = { includeAppSources: true }
        isI18nMapped = true
        usingMultiSitemaps = true
      }
    }

    // @ts-expect-error untyped
    nuxt.hooks.hook('robots:config', (robotsConfig) => {
      robotsConfig.sitemap.push(usingMultiSitemaps ? '/sitemap_index.xml' : `/${config.sitemapName}`)
    })
    // avoid issues with module order
    nuxt.hooks.hook('modules:done', async () => {
      const robotsModuleName = ['nuxt-simple-robots', '@nuxtjs/robots'].find(s => hasNuxtModule(s))
      let needsRobotsPolyfill = true
      if (robotsModuleName) {
        const robotsVersion = await getNuxtModuleVersion(robotsModuleName)
        // we want to keep versions in sync
        if (robotsVersion && !await hasNuxtModuleCompatibility(robotsModuleName, '>=4'))
          logger.warn(`You are using ${robotsModuleName} v${robotsVersion}. For the best compatibility, please upgrade to ${robotsModuleName} v4.0.0 or higher.`)
        else
          needsRobotsPolyfill = false
      }
      // this is added in v4 of Nuxt Robots
      if (needsRobotsPolyfill) {
        addServerImports([{
          name: 'getPathRobotConfigPolyfill',
          as: 'getPathRobotConfig',
          from: resolve('./runtime/server/composables/getPathRobotConfigPolyfill'),
        }])
      }
    })

    extendTypes(name!, async ({ typesPath }) => {
      return `
declare module 'nitropack' {
  interface PrerenderRoute {
    _sitemap?: import('${typesPath}').SitemapUrl
  }
  interface NitroRouteRules {
    index?: boolean
    sitemap?: import('${typesPath}').SitemapItemDefaults
  }
  interface NitroRouteConfig {
    index?: boolean
    sitemap?: import('${typesPath}').SitemapItemDefaults
  }
  interface NitroRuntimeHooks {
    'sitemap:index-resolved': (ctx: import('${typesPath}').SitemapIndexRenderCtx) => void | Promise<void>
    'sitemap:input': (ctx: import('${typesPath}').SitemapInputCtx) => void | Promise<void>
    'sitemap:resolved': (ctx: import('${typesPath}').SitemapRenderCtx) => void | Promise<void>
    'sitemap:output': (ctx: import('${typesPath}').SitemapOutputHookCtx) => void | Promise<void>
  }
}
declare module 'vue-router' {
    interface RouteMeta {
        sitemap?: import('${typesPath}').SitemapItemDefaults
    }
}
`
    })
    const nitroPreset = resolveNitroPreset()
    // check if the user provided route /api/_sitemap-urls exists
    const prerenderedRoutes = (nuxt.options.nitro.prerender?.routes || []) as string[]
    const prerenderSitemap = isNuxtGenerate() || includesSitemapRoot(config.sitemapName, prerenderedRoutes)
    const routeRules: NitroRouteConfig = {}
    nuxt.options.nitro.routeRules = nuxt.options.nitro.routeRules || {}
    if (prerenderSitemap) {
      // add route rules for sitemap xmls so they're rendered properly
      routeRules.headers = {
        'Content-Type': 'text/xml; charset=UTF-8',
        'Cache-Control': config.cacheMaxAgeSeconds ? `public, max-age=${config.cacheMaxAgeSeconds}, must-revalidate` : 'no-cache, no-store',
        'X-Sitemap-Prerendered': new Date().toISOString(),
      }
    }
    if (!nuxt.options.dev && !isNuxtGenerate() && config.cacheMaxAgeSeconds && config.runtimeCacheStorage !== false) {
      routeRules[nitroPreset.includes('vercel') ? 'isr' : 'swr'] = config.cacheMaxAgeSeconds
      routeRules.cache = {
        // handle multi-tenancy
        swr: true,
        maxAge: config.cacheMaxAgeSeconds,
        varies: ['X-Forwarded-Host', 'X-Forwarded-Proto', 'Host'],
      }
      // use different cache base if configured
      if (typeof config.runtimeCacheStorage === 'object')
        routeRules.cache.base = 'sitemap'
    }
    if (config.xsl) {
      nuxt.options.nitro.routeRules[config.xsl] = {
        headers: {
          'Content-Type': 'application/xslt+xml',
        },
      }
    }
    if (usingMultiSitemaps) {
      nuxt.options.nitro.routeRules['/sitemap.xml'] = { redirect: '/sitemap_index.xml' }
      nuxt.options.nitro.routeRules['/sitemap_index.xml'] = routeRules
      if (typeof config.sitemaps === 'object') {
        for (const k in config.sitemaps) {
          nuxt.options.nitro.routeRules[joinURL(config.sitemapsPathPrefix || '', `/${k}.xml`)] = routeRules
        }
      }
      else {
        // TODO we should support the chunked generated sitemap names
        nuxt.options.nitro.routeRules[`/${config.sitemapName}`] = routeRules
      }
    }
    else {
      nuxt.options.nitro.routeRules[`/${config.sitemapName}`] = routeRules
    }

    if (config.experimentalWarmUp)
      addServerPlugin(resolve('./runtime/server/plugins/warm-up'))
    if (config.experimentalCompression)
      addServerPlugin(resolve('./runtime/server/plugins/compression'))

    // @ts-expect-error untyped
    const isNuxtContentDocumentDriven = (!!nuxt.options.content?.documentDriven || config.strictNuxtContentPaths)
    const usingNuxtContent = hasNuxtModule('@nuxt/content')
    const isNuxtContentV3 = usingNuxtContent && await hasNuxtModuleCompatibility('@nuxt/content', '^3')
    const nuxtV3Collections = new Set<string>()
    const isNuxtContentV2 = usingNuxtContent && await hasNuxtModuleCompatibility('@nuxt/content', '^2')
    if (isNuxtContentV3) {
      // check if content was loaded first
      if (nuxt.options._installedModules.some(m => m.meta.name === 'Content')) {
        logger.warn('You have loaded `@nuxt/content` before `@nuxtjs/sitemap`, this may cause issues with the integration. Please ensure `@nuxtjs/sitemap` is loaded first.')
      }
      // // exclude /__nuxt_content
      config.exclude!.push('/__nuxt_content/**')
      // TODO this is a hack until content gives us an alias
      nuxt.options.alias['#sitemap/content-v3-nitro-path'] = resolve(dirname(resolveModule('@nuxt/content')), 'runtime/nitro')
      nuxt.hooks.hook('content:file:afterParse', (ctx: FileAfterParseHook) => {
        const content = ctx.content as {
          body: { value: [string, Record<string, any>][] }
          sitemap?: Partial<SitemapUrl> | false
          path: string
          updatedAt?: string
        } & Record<string, any>
        nuxtV3Collections.add(ctx.collection.name)
        // ignore .dot files and paths
        if (String(ctx.content.path).includes('/.')) {
          ctx.content.sitemap = null
          return
        }
        if (!('sitemap' in ctx.collection.fields)) {
          ctx.content.sitemap = null
          return
        }
        // support sitemap: false
        if (typeof content.sitemap !== 'undefined' && !content.sitemap) {
          ctx.content.sitemap = null
          return
        }
        if (ctx.content.robots === false) {
          ctx.content.sitemap = null
          return
        }
        // add any top level images
        const images: SitemapUrl['images'] = []
        if (config.discoverImages) {
          images.push(...(content.body.value
            ?.filter(c =>
              ['image', 'img', 'nuxtimg', 'nuxt-img'].includes(c[0]),
            )
            .filter(c => c[1]?.src)
            .map(c => ({ loc: c[1].src })) || []),
          )
        }
        // Note: videos only supported through prerendering for simpler logic

        const lastmod = content.seo?.articleModifiedTime || content.updatedAt
        const defaults: Partial<SitemapUrl> = {
          loc: content.path,
        }
        if (images.length > 0)
          defaults.images = images
        if (lastmod)
          defaults.lastmod = lastmod
        ctx.content.sitemap = defu(typeof content.sitemap === 'object' ? content.sitemap : {}, defaults) as Partial<SitemapUrl>
      })

      addServerHandler({
        route: '/__sitemap__/nuxt-content-urls.json',
        handler: resolve('./runtime/server/routes/__sitemap__/nuxt-content-urls-v3'),
      })
      if (config.strictNuxtContentPaths) {
        logger.warn('You have set `strictNuxtContentPaths: true` but are using @nuxt/content v3. This is not required, please remove it.')
      }
      appGlobalSources.push({
        context: {
          name: '@nuxt/content@v3:urls',
          description: 'Generated from your markdown files.',
          tips: [`Parsing the following collections: ${Array.from(nuxtV3Collections).join(', ')}`],
        },
        fetch: '/__sitemap__/nuxt-content-urls.json',
      })
    }
    else if (isNuxtContentV2) {
      addServerPlugin(resolve('./runtime/server/plugins/nuxt-content-v2'))
      addServerHandler({
        route: '/__sitemap__/nuxt-content-urls.json',
        handler: resolve('./runtime/server/routes/__sitemap__/nuxt-content-urls-v2'),
      })
      const tips: string[] = []
      // @ts-expect-error untyped
      if (nuxt.options.content?.documentDriven)
        tips.push('Enabled because you\'re using `@nuxt/content` with `documentDriven: true`.')
      else if (config.strictNuxtContentPaths)
        tips.push('Enabled because you\'ve set `config.strictNuxtContentPaths: true`.')
      else
        tips.push('You can provide a `sitemap` key in your markdown frontmatter to configure specific URLs. Make sure you include a `loc`.')

      appGlobalSources.push({
        context: {
          name: '@nuxt/content@v2:urls',
          description: 'Generated from your markdown files.',
          tips,
        },
        fetch: '/__sitemap__/nuxt-content-urls.json',
      })
    }

    // config -> sitemaps
    const sitemaps: ModuleRuntimeConfig['sitemaps'] = {}

    if (usingMultiSitemaps) {
      addServerHandler({
        route: '/sitemap_index.xml',
        handler: resolve('./runtime/server/routes/sitemap_index.xml'),
        lazy: true,
        middleware: false,
      })
      if (config.sitemapsPathPrefix && config.sitemapsPathPrefix !== '/') {
        addServerHandler({
          route: joinURL(config.sitemapsPathPrefix, `/**:sitemap`),
          handler: resolve('./runtime/server/routes/sitemap/[sitemap].xml'),
          lazy: true,
          middleware: false,
        })
      }
      else {
        // register each key as a route
        for (const sitemapName of Object.keys(config.sitemaps || {})) {
          addServerHandler({
            route: withLeadingSlash(`${sitemapName}.xml`),
            handler: resolve('./runtime/server/routes/sitemap/[sitemap].xml'),
            lazy: true,
            middleware: false,
          })
        }
      }
      sitemaps.index = {
        sitemapName: 'index',
        _route: withBase('sitemap_index.xml', nuxt.options.app.baseURL || '/'),
        // @ts-expect-error untyped
        sitemaps: [...(config.sitemaps!.index || []), ...(config.appendSitemaps || [])],
      }
      if (typeof config.sitemaps === 'object') {
        for (const sitemapName in config.sitemaps) {
          if (sitemapName === 'index')
            continue
          const definition = config.sitemaps[sitemapName] as MultiSitemapEntry[string]
          sitemaps[sitemapName as keyof typeof sitemaps] = defu(
            {
              sitemapName,
              _route: withBase(joinURL(config.sitemapsPathPrefix || '', `${sitemapName}.xml`), nuxt.options.app.baseURL || '/'),
              _hasSourceChunk: typeof definition.urls !== 'undefined' || definition.sources?.length,
            },
            { ...definition, urls: undefined, sources: undefined },
            { include: config.include, exclude: config.exclude },
          ) as ModuleRuntimeConfig['sitemaps'][string]
        }
      }
      else {
        // we have to register it as a middleware we can't match the URL pattern
        sitemaps.chunks = {
          sitemapName: 'chunks',
          defaults: config.defaults,
          include: config.include,
          exclude: config.exclude,
          includeAppSources: true,
        }
      }
    }
    else {
      // note: we don't need urls for the root sitemap, only child sitemaps
      sitemaps[config.sitemapName] = <SitemapDefinition> {
        sitemapName: config.sitemapName,
        route: withBase(config.sitemapName, nuxt.options.app.baseURL || '/'), // will contain the xml
        defaults: config.defaults,
        include: config.include,
        exclude: config.exclude,
        includeAppSources: true,
      }
    }

    // for each sitemap, we need to transform the include and exclude
    // if the include or exclude has a URL without a locale prefix, then we insert all locale prefixes
    if (resolvedAutoI18n && usingI18nPages && !hasDisabledAutoI18n) {
      const pages = nuxtI18nConfig?.pages || {} as Record<string, Record<string, string>>
      for (const sitemapName in sitemaps) {
        if (['index', 'chunks'].includes(sitemapName))
          continue
        const sitemap = sitemaps[sitemapName]
        function mapToI18nPages(path: FilterInput): FilterInput[] {
          if (typeof path !== 'string')
            return [path]
          const withoutSlashes = withoutTrailingSlash(withoutLeadingSlash(path)).replace('/index', '')
          if (pages && withoutSlashes in pages) {
            const pageLocales = pages[withoutSlashes]
            if (pageLocales) {
              return Object.keys(pageLocales).map(localeCode => withLeadingSlash(generatePathForI18nPages({
                localeCode,
                pageLocales: pageLocales[localeCode] as string,
                nuxtI18nConfig,
                normalisedLocales,
              })))
            }
          }
          let match = [path]
          // alternatively see if the path matches the default locale within
          Object.values(pages).forEach((pageLocales) => {
            // @ts-expect-error untyped
            if (pageLocales && nuxtI18nConfig.defaultLocale in pageLocales && pageLocales[nuxtI18nConfig.defaultLocale] === path)
              match = Object.keys(pageLocales).map(localeCode => withLeadingSlash(generatePathForI18nPages({ localeCode, pageLocales: pageLocales[localeCode], nuxtI18nConfig, normalisedLocales })))
          })
          return match
        }
        sitemap.include = (sitemap.include || []).flatMap(path => mapToI18nPages(path))
        sitemap.exclude = (sitemap.exclude || []).flatMap(path => mapToI18nPages(path))
      }
    }
    if (resolvedAutoI18n && resolvedAutoI18n.locales && resolvedAutoI18n.strategy !== 'no_prefix') {
      const i18n = resolvedAutoI18n
      for (const sitemapName in sitemaps) {
        if (['index', 'chunks'].includes(sitemapName))
          continue
        const sitemap = sitemaps[sitemapName]
        sitemap.include = (sitemap.include || []).map(path => splitPathForI18nLocales(path, i18n)).flat()
        sitemap.exclude = (sitemap.exclude || []).map(path => splitPathForI18nLocales(path, i18n)).flat()
      }
    }
    for (const sitemapName in sitemaps) {
      const sitemap = sitemaps[sitemapName]
      // we need to normalize the RegExp to a string because of the useRuntimeConfig can't jsonify it
      // note: this needs to occur after i18n has extended the rules
      sitemap.include = normalizeFilters(sitemap.include)
      sitemap.exclude = normalizeFilters(sitemap.exclude)
    }

    const runtimeConfig: ModuleRuntimeConfig = {
      isI18nMapped,
      sitemapName: config.sitemapName,
      isMultiSitemap: usingMultiSitemaps,
      excludeAppSources: config.excludeAppSources,
      cacheMaxAgeSeconds: nuxt.options.dev ? 0 : config.cacheMaxAgeSeconds,

      autoLastmod: config.autoLastmod,
      defaultSitemapsChunkSize: config.defaultSitemapsChunkSize,

      minify: config.minify,
      sortEntries: config.sortEntries,
      debug: config.debug,
      // needed for nuxt/content integration and prerendering
      discoverImages: config.discoverImages,
      discoverVideos: config.discoverVideos,
      sitemapsPathPrefix: config.sitemapsPathPrefix,

      /* @nuxt/content */
      isNuxtContentDocumentDriven,

      /* xsl styling */
      xsl: config.xsl,
      xslTips: config.xslTips,
      xslColumns: config.xslColumns,
      credits: config.credits,
      version: version!,
      sitemaps,
    }
    if (resolvedAutoI18n)
      runtimeConfig.autoI18n = resolvedAutoI18n
    // @ts-expect-error untyped
    nuxt.options.runtimeConfig.sitemap = runtimeConfig

    if (config.debug || nuxt.options.dev) {
      addServerHandler({
        route: '/__sitemap__/debug.json',
        handler: resolve('./runtime/server/routes/__sitemap__/debug'),
      })

      setupDevToolsUI(config, resolve)
    }

    const imports: typeof nuxt.options.imports.imports = [
      {
        from: resolve('./runtime/server/composables/defineSitemapEventHandler'),
        name: 'defineSitemapEventHandler',
      },
      {
        from: resolve('./runtime/server/composables/asSitemapUrl'),
        name: 'asSitemapUrl',
      },
    ]
    addServerImports(imports)

    // we may not have pages
    const pagesPromise = createPagesPromise()
    const nitroPromise = createNitroPromise()
    let resolvedConfigUrls = false
    nuxt.hooks.hook('nitro:config', (nitroConfig) => {
      nitroConfig.virtual!['#sitemap-virtual/global-sources.mjs'] = async () => {
        const { prerenderUrls, routeRules } = generateExtraRoutesFromNuxtConfig()
        const prerenderUrlsFinal = [
          ...prerenderUrls,
          ...((await nitroPromise)._prerenderedRoutes || [])
            .filter((r) => {
              const lastSegment = r.route.split('/').pop()
              // check for file in lastSegment using regex
              const isExplicitFile = !!(lastSegment?.match(/\.[0-9a-z]+$/i)?.[0])
              // avoid adding fallback pages to sitemap
              if (isExplicitFile || r.error || ['/200.html', '/404.html', '/index.html'].includes(r.route))
                return false
              return r.contentType?.includes('text/html')
            })
            .map(r => r._sitemap),
        ]
        const pageSource = convertNuxtPagesToSitemapEntries(await pagesPromise, {
          isI18nMapped,
          autoLastmod: config.autoLastmod,
          defaultLocale: nuxtI18nConfig.defaultLocale || 'en',
          strategy: nuxtI18nConfig.strategy || 'no_prefix',
          routesNameSeparator: nuxtI18nConfig.routesNameSeparator,
          normalisedLocales,
          filter: {
            include: normalizeFilters(config.include),
            exclude: normalizeFilters(config.exclude),
          },
          isI18nMicro: i18nModule === 'nuxt-i18n-micro',
        })
        if (!pageSource.length) {
          pageSource.push(nuxt.options.app.baseURL || '/')
        }
        if (!resolvedConfigUrls && config.urls) {
          if (config.urls) {
            userGlobalSources.push({
              context: {
                name: 'sitemap:urls',
                description: 'Set with the `sitemap.urls` config.',
              },
              urls: await resolveUrls(config.urls, { path: 'sitemap:urls', logger }),
            })
          }
          // we want to avoid adding duplicates as well as hitting api endpoints multiple times
          resolvedConfigUrls = true
        }
        const globalSources: SitemapSourceInput[] = [
          ...userGlobalSources.map((s) => {
            if (typeof s === 'string' || Array.isArray(s)) {
              return <SitemapSourceBase> {
                sourceType: 'user',
                fetch: s,
              }
            }
            s.sourceType = 'user'
            return s
          }),
          ...(config.excludeAppSources === true
            ? []
            : <typeof appGlobalSources>[
              ...appGlobalSources,
              {
                context: {
                  name: 'nuxt:pages',
                  description: 'Generated from your static page files.',
                  tips: [
                    'Can be disabled with `{ excludeAppSources: [\'nuxt:pages\'] }`.',
                  ],
                },
                urls: pageSource,
              },
              {
                context: {
                  name: 'nuxt:route-rules',
                  description: 'Generated from your route rules config.',
                  tips: [
                    'Can be disabled with `{ excludeAppSources: [\'nuxt:route-rules\'] }`.',
                  ],
                },
                urls: routeRules,
              },
              {
                context: {
                  name: 'nuxt:prerender',
                  description: 'Generated at build time when prerendering.',
                  tips: [
                    'Can be disabled with `{ excludeAppSources: [\'nuxt:prerender\'] }`.',
                  ],
                },
                urls: prerenderUrlsFinal,
              },
            ])
            .filter(s =>
              !(config.excludeAppSources as AppSourceContext[]).includes(s.context.name as AppSourceContext)
              && (!!s.urls?.length || !!s.fetch))
            .map((s) => {
              s.sourceType = 'app'
              return s
            }),
        ]
        return `export const sources = ${JSON.stringify(globalSources, null, 4)}`
      }

      const extraSitemapModules = typeof config.sitemaps == 'object' ? Object.keys(config.sitemaps).filter(n => n !== 'index') : []
      const sitemapSources: Record<string, SitemapSourceInput[]> = {}
      nitroConfig.virtual![`#sitemap-virtual/child-sources.mjs`] = async () => {
        for (const sitemapName of extraSitemapModules) {
          sitemapSources[sitemapName] = sitemapSources[sitemapName] || []
          const definition = (config.sitemaps as Record<string, SitemapDefinition>)[sitemapName] as SitemapDefinition
          if (!sitemapSources[sitemapName].length) {
            if (definition.urls) {
              sitemapSources[sitemapName].push({
                context: {
                  name: `sitemaps:${sitemapName}:urls`,
                  description: 'Set with the `sitemap.urls` config.',
                },
                urls: await resolveUrls(definition.urls, { path: `sitemaps:${sitemapName}:urls`, logger }),
              })
            }
            sitemapSources[sitemapName].push(...(definition.sources || [])
              .map((s) => {
                if (typeof s === 'string' || Array.isArray(s)) {
                  return <SitemapSourceBase> {
                    sourceType: 'user',
                    fetch: s,
                  }
                }
                s.sourceType = 'user'
                return s
              }),
            )
          }
        }
        return `export const sources = ${JSON.stringify(sitemapSources, null, 4)}`
      }
    })

    // always add the styles
    if (config.xsl === '/__sitemap__/style.xsl') {
      addServerHandler({
        route: config.xsl,
        handler: resolve('./runtime/server/routes/sitemap.xsl'),
      })
      config.xsl = withBase(config.xsl, nuxt.options.app.baseURL)

      if (prerenderSitemap)
        addPrerenderRoutes(config.xsl)
    }

    // either this will redirect to sitemap_index or will render the main sitemap.xml
    addServerHandler({
      route: `/${config.sitemapName}`,
      handler: resolve('./runtime/server/routes/sitemap.xml'),
    })

    setupPrerenderHandler({ runtimeConfig, logger })
  },
})
