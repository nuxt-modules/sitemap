import {
  addPrerenderRoutes,
  addServerHandler,
  addServerImports,
  addServerPlugin,
  createResolver,
  defineNuxtModule,
  findPath,
  getNuxtModuleVersion,
  hasNuxtModule,
  hasNuxtModuleCompatibility,
  useLogger,
} from '@nuxt/kit'
import { withBase, withoutLeadingSlash } from 'ufo'
import { installNuxtSiteConfig } from 'nuxt-site-config-kit'
import type { NuxtI18nOptions } from '@nuxtjs/i18n/dist/module'
import { defu } from 'defu'
import type { NitroRouteConfig } from 'nitropack'
import { version } from '../package.json'
import type {
  AppSourceContext,
  AutoI18nConfig,
  ModuleRuntimeConfig,
  MultiSitemapEntry,
  NormalisedLocales,
  SitemapDefinition,
  SitemapOutputHookCtx,
  SitemapRenderCtx,
  SitemapSourceBase,
  SitemapSourceInput,
  SitemapSourceResolved,
  ModuleOptions as _ModuleOptions,
} from './runtime/types'
import { convertNuxtPagesToSitemapEntries, generateExtraRoutesFromNuxtConfig, resolveUrls } from './util/nuxtSitemap'
import { createNitroPromise, createPagesPromise, extendTypes, getNuxtModuleOptions } from './util/kit'
import { setupPrerenderHandler } from './prerender'
import { mergeOnKey } from './runtime/utils'
import { setupDevToolsUI } from './devtools'
import { normaliseDate } from './runtime/sitemap/urlset/normalise'
import { splitPathForI18nLocales } from './util/i18n'

export interface ModuleOptions extends _ModuleOptions {}

export interface ModuleHooks {
  /**
   * @deprecated use `sitemap:resolved` or `sitemap:output`
   */
  'sitemap:prerender': (ctx: SitemapRenderCtx) => Promise<void> | void
  'sitemap:resolved': (ctx: SitemapRenderCtx) => Promise<void> | void
  'sitemap:output': (ctx: SitemapOutputHookCtx) => Promise<void> | void
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-simple-sitemap',
    compatibility: {
      nuxt: '^3.7.0',
      bridge: false,
    },
    configKey: 'sitemap',
  },
  defaults: {
    enabled: true,
    credits: true,
    cacheMaxAgeSeconds: 60 * 10, // cache for 10 minutes
    debug: false,
    defaultSitemapsChunkSize: 1000,
    autoLastmod: false,
    discoverImages: true,
    dynamicUrlsApiEndpoint: '/api/_sitemap-urls',
    urls: [],
    sortEntries: true,
    xsl: '/__sitemap__/style.xsl',
    xslTips: true,
    strictNuxtContentPaths: false,
    runtimeCacheStorage: true,
    sitemapName: 'sitemap.xml',
    // cacheControlHeader: 'max-age=600, must-revalidate',
    defaults: {},
    // index sitemap options filtering
    include: [],
    exclude: ['/_nuxt/**', '/api/**'],
    // sources
    sources: [],
    excludeAppSources: [],
    inferStaticPagesAsRoutes: true,
  },
  async setup(config, nuxt) {
    const logger = useLogger('nuxt-simple-sitemap')
    logger.level = (config.debug || nuxt.options.debug) ? 4 : 3
    if (config.enabled === false) {
      logger.debug('The module is disabled, skipping setup.')
      return
    }
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

    const { resolve } = createResolver(import.meta.url)
    // for trailing slashes / canonical absolute urls
    await installNuxtSiteConfig()
    const userGlobalSources: SitemapSourceInput[] = [
      ...config.sources || [],
    ]
    const appGlobalSources: (SitemapSourceBase | SitemapSourceResolved)[] = []

    nuxt.options.nitro.storage = nuxt.options.nitro.storage || {}
    // provide cache storage for prerendering
    if (nuxt.options._generate) {
      nuxt.options.nitro.storage['nuxt-simple-sitemap'] = {
        driver: 'memory',
      }
    }
    else if (config.runtimeCacheStorage && !nuxt.options.dev && typeof config.runtimeCacheStorage === 'object') {
      nuxt.options.nitro.storage['nuxt-simple-sitemap'] = config.runtimeCacheStorage
    }

    if (!config.sitemapName.endsWith('xml')) {
      const newName = `${config.sitemapName.split('.')[0]}.xml`
      logger.warn(`You have provided a \`sitemapName\` that does not end with \`.xml\`. This is not supported by search engines, renaming to \`${newName}\`.`)
      config.sitemapName = newName
    }
    config.sitemapName = withoutLeadingSlash(config.sitemapName)

    let usingMultiSitemaps = !!config.sitemaps

    let isI18nMapped = false
    let nuxtI18nConfig: NuxtI18nOptions = {}
    let resolvedAutoI18n: false | AutoI18nConfig = typeof config.autoI18n === 'boolean' ? false : config.autoI18n || false
    const hasDisabledAutoI18n = typeof config.autoI18n === 'boolean' && !config.autoI18n
    let normalisedLocales: NormalisedLocales = []
    if (hasNuxtModule('@nuxtjs/i18n')) {
      const i18nVersion = await getNuxtModuleVersion('@nuxtjs/i18n')
      if (!await hasNuxtModuleCompatibility('@nuxtjs/i18n', '>=8'))
        logger.warn(`You are using @nuxtjs/i18n v${i18nVersion}. For the best compatibility, please upgrade to @nuxtjs/i18n v8.0.0 or higher.`)
      nuxtI18nConfig = (await getNuxtModuleOptions('@nuxtjs/i18n') || {}) as NuxtI18nOptions
      normalisedLocales = mergeOnKey((nuxtI18nConfig.locales || []).map(locale => typeof locale === 'string' ? { code: locale } : locale), 'code')
      const usingI18nPages = Object.keys(nuxtI18nConfig.pages || {}).length
      if (usingI18nPages && !hasDisabledAutoI18n) {
        const i18nPagesSources: SitemapSourceBase = {
          context: {
            name: '@nuxtjs/i18n:pages',
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
                hreflang: normalisedLocales.find(nl => nl.code === l)?.iso || l,
                href: pageLocales[l],
              }))
            if (alternatives.length && nuxtI18nConfig.defaultLocale && pageLocales[nuxtI18nConfig.defaultLocale])
              alternatives.push({ hreflang: 'x-default', href: pageLocales[nuxtI18nConfig.defaultLocale] })
            i18nPagesSources.urls!.push({
              _sitemap: locale.iso || locale.code,
              loc: pageLocales[localeCode],
              alternatives,
            })
          }
        }
        appGlobalSources.push(i18nPagesSources)
        // pages will be wrong
        if (Array.isArray(config.excludeAppSources))
          config.excludeAppSources.push('nuxt:pages')
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
      // if they haven't set `sitemaps` explicitly then we can set it up automatically for them
      if (typeof config.sitemaps === 'undefined' && !!resolvedAutoI18n && nuxtI18nConfig.strategy !== 'no_prefix') {
        // @ts-expect-error untyped
        config.sitemaps = { index: [] }
        for (const locale of resolvedAutoI18n.locales) {
          // @ts-expect-error untyped
          config.sitemaps[locale.iso || locale.code] = { includeAppSources: true }
        }
        isI18nMapped = true
        usingMultiSitemaps = true
      }
    }

    if (hasNuxtModule('nuxt-simple-robots')) {
      const robotsVersion = await getNuxtModuleVersion('nuxt-simple-robots')
      // we want to keep versions in sync
      if (!await hasNuxtModuleCompatibility('nuxt-simple-robots', '>=3'))
        logger.warn(`You are using nuxt-simple-robots v${robotsVersion}. For the best compatibility, please upgrade to nuxt-simple-robots v3.0.0 or higher.`)
      // @ts-expect-error untyped
      nuxt.hooks.hook('robots:config', (robotsConfig) => {
        robotsConfig.sitemap.push(usingMultiSitemaps ? '/sitemap_index.xml' : `/${config.sitemapName}`)
      })
    }

    extendTypes('nuxt-simple-sitemap', async ({ typesPath }) => {
      return `
declare module 'nitropack' {
  interface NitroRouteRules {
    index?: boolean
    sitemap?: import('${typesPath}').SitemapItemDefaults
  }
  interface NitroRouteConfig {
    index?: boolean
    sitemap?: import('${typesPath}').SitemapItemDefaults
  }
  interface NitroRuntimeHooks {
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
    // check if the user provided route /api/_sitemap-urls exists
    const prerenderedRoutes = (nuxt.options.nitro.prerender?.routes || []) as string[]
    const prerenderSitemap = nuxt.options._generate || prerenderedRoutes.includes(`/${config.sitemapName}`) || prerenderedRoutes.includes('/sitemap_index.xml')
    const routeRules: NitroRouteConfig = {}
    if (!nuxt.options.dev && config.cacheMaxAgeSeconds && config.runtimeCacheStorage !== false) {
      routeRules.swr = config.cacheMaxAgeSeconds
      routeRules.cache = {
        // handle multi-tenancy
        varies: ['X-Forwarded-Host', 'X-Forwarded-Proto', 'Host'],
      }
      // use different cache base if configured
      if (typeof config.runtimeCacheStorage === 'object')
        routeRules.cache.base = 'nuxt-simple-sitemap'
    }
    if (prerenderSitemap) {
      // add route rules for sitemap xmls so they're rendered properly
      routeRules.headers = {
        'Content-Type': 'text/xml; charset=UTF-8',
      }
    }
    nuxt.options.routeRules = nuxt.options.routeRules || {}
    if (usingMultiSitemaps) {
      nuxt.options.routeRules['/sitemap_index.xml'] = routeRules
      if (typeof config.sitemaps === 'object') {
        for (const k in config.sitemaps)
          nuxt.options.routeRules[`/${k}-sitemap.xml`] = routeRules
      }
      else {
        // TODO we should support the chunked generated sitemap names
        nuxt.options.routeRules[`/${config.sitemapName}`] = routeRules
      }
    }
    else {
      nuxt.options.routeRules[`/${config.sitemapName}`] = routeRules
    }

    if (config.experimentalWarmUp)
      addServerPlugin(resolve('./runtime/plugins/warm-up'))

    // @ts-expect-error untyped
    const isNuxtContentDocumentDriven = (!!nuxt.options.content?.documentDriven || config.strictNuxtContentPaths)
    if (hasNuxtModule('@nuxt/content')) {
      addServerPlugin(resolve('./runtime/plugins/nuxt-content'))
      addServerHandler({
        route: '/__sitemap__/nuxt-content-urls.json',
        handler: resolve('./runtime/routes/__sitemap__/nuxt-content-urls'),
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
          name: '@nuxt/content:urls',
          description: 'Generated from your markdown files.',
          tips,
        },
        fetch: '/__sitemap__/nuxt-content-urls.json',
      })
    }
    const hasLegacyDefaultApiSource = !!(await findPath(resolve(nuxt.options.serverDir, 'api/_sitemap-urls')))
    if (
      // make sure they didn't manually add it as a source
      !config.sources?.includes('/api/_sitemap-urls')
      // if they didn't and they have the file OR if they've manually configured the URL to something else, provide the source
      && (hasLegacyDefaultApiSource || config.dynamicUrlsApiEndpoint !== '/api/_sitemap-urls')
    ) {
      userGlobalSources.push({
        context: {
          name: 'dynamicUrlsApiEndpoint',
          description: 'Generated from your dynamicUrlsApiEndpoint config.',
          tips: [
            'The `dynamicUrlsApiEndpoint` config is deprecated.',
            hasLegacyDefaultApiSource
              ? 'Consider renaming the `api/_sitemap-urls` file and add it the `sitemap.sources` config instead. This provides more explicit sitemap generation.'
              : 'Consider switching to using the `sitemap.sources` config which also supports fetch options.',
          ],
        },
        fetch: hasLegacyDefaultApiSource ? '/api/_sitemap-urls' : config.dynamicUrlsApiEndpoint as string,
      })
    }
    else {
      config.dynamicUrlsApiEndpoint = false
    }

    // config -> sitemaps
    const sitemaps: ModuleRuntimeConfig['sitemaps'] = {}
    if (usingMultiSitemaps) {
      addServerHandler({
        route: '/sitemap_index.xml',
        handler: resolve('./runtime/routes/sitemap_index.xml'),
      })
      addServerHandler({
        handler: resolve('./runtime/middleware/[sitemap]-sitemap.xml'),
      })
      sitemaps.index = {
        sitemapName: 'index',
        _route: withBase('sitemap_index.xml', nuxt.options.app.baseURL || '/'),
        // TODO better index support
        // @ts-expect-error untyped
        sitemaps: config.sitemaps!.index || [],
      }
      if (typeof config.sitemaps === 'object') {
        for (const sitemapName in config.sitemaps) {
          if (sitemapName === 'index')
            continue
          const definition = config.sitemaps[sitemapName] as MultiSitemapEntry[string]
          sitemaps[sitemapName as keyof typeof sitemaps] = defu(
            {
              sitemapName,
              _route: withBase(`${sitemapName}-sitemap.xml`, nuxt.options.app.baseURL || '/'),
              _hasSourceChunk: typeof definition.urls !== 'undefined' || definition.sources?.length || !!definition.dynamicUrlsApiEndpoint,
            },
            { ...definition, urls: undefined, sources: undefined },
            { include: config.include, exclude: config.exclude },
          ) as ModuleRuntimeConfig['sitemaps'][string]
        }
      }
      else {
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

    const runtimeConfig: ModuleRuntimeConfig = {
      isI18nMapped,
      sitemapName: config.sitemapName,
      isMultiSitemap: usingMultiSitemaps,
      excludeAppSources: config.excludeAppSources,

      autoLastmod: config.autoLastmod,
      defaultSitemapsChunkSize: config.defaultSitemapsChunkSize,

      sortEntries: config.sortEntries,
      debug: config.debug,
      // needed for nuxt/content integration and prerendering
      discoverImages: config.discoverImages,

      /* @nuxt/content */
      isNuxtContentDocumentDriven,

      /* xsl styling */
      xsl: config.xsl,
      xslTips: config.xslTips,
      xslColumns: config.xslColumns,
      credits: config.credits,
      version,
      sitemaps,
    }
    if (resolvedAutoI18n)
      runtimeConfig.autoI18n = resolvedAutoI18n
    // @ts-expect-error untyped
    nuxt.options.runtimeConfig['nuxt-simple-sitemap'] = runtimeConfig

    if (config.debug || nuxt.options.dev) {
      addServerHandler({
        route: '/__sitemap__/debug.json',
        handler: resolve('./runtime/routes/__sitemap__/debug'),
      })

      setupDevToolsUI(config, resolve)
    }

    // support deprecated config
    if (!config.inferStaticPagesAsRoutes)
      config.excludeAppSources = true

    const imports: typeof nuxt.options.imports.imports = [
      {
        from: resolve('./runtime/composables/defineSitemapEventHandler'),
        name: 'defineSitemapEventHandler',
      },
      {
        from: resolve('./runtime/composables/asSitemapUrl'),
        name: 'asSitemapUrl',
      },
    ]
    addServerImports(imports)

    // we may not have pages
    const pagesPromise = createPagesPromise()
    const nitroPromise = createNitroPromise()
    let resolvedConfigUrls = false
    nuxt.hooks.hook('nitro:config', (nitroConfig) => {
      nitroConfig.virtual!['#nuxt-simple-sitemap/global-sources.mjs'] = async () => {
        const { prerenderUrls, routeRules } = generateExtraRoutesFromNuxtConfig()
        const prerenderUrlsFinal = [
          ...prerenderUrls,
          ...((await nitroPromise)._prerenderedRoutes || [])
            .filter(r => (!r.fileName || r.fileName.endsWith('.html')) && !r.route.endsWith('.html') && !r.route.startsWith('/api/'))
            .map(r => r._sitemap),
        ]
        const pageSource = convertNuxtPagesToSitemapEntries(await pagesPromise, {
          isI18nMapped,
          autoLastmod: config.autoLastmod,
          defaultLocale: nuxtI18nConfig.defaultLocale || 'en',
          strategy: nuxtI18nConfig.strategy || 'no_prefix',
          routesNameSeparator: nuxtI18nConfig.routesNameSeparator,
          normalisedLocales,
        })
        if (!resolvedConfigUrls) {
          config.urls && userGlobalSources.push({
            context: {
              name: 'sitemap:urls',
              description: 'Set with the `sitemap.urls` config.',
            },
            urls: await resolveUrls(config.urls),
          })
          // we want to avoid adding duplicates as well as hitting api endpoints multiple times
          resolvedConfigUrls = true
        }
        const globalSources: SitemapSourceInput[] = [
          ...userGlobalSources.map((s) => {
            if (typeof s === 'string') {
              return <SitemapSourceBase>{
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
      nitroConfig.virtual![`#nuxt-simple-sitemap/child-sources.mjs`] = async () => {
        for (const sitemapName of extraSitemapModules) {
          sitemapSources[sitemapName] = sitemapSources[sitemapName] || []
          const definition = (config.sitemaps as Record<string, SitemapDefinition>)[sitemapName] as SitemapDefinition
          if (!sitemapSources[sitemapName].length) {
            definition.urls && sitemapSources[sitemapName].push({
              context: {
                name: `sitemaps:${sitemapName}:urls`,
                description: 'Set with the `sitemap.urls` config.',
              },
              urls: await resolveUrls(definition.urls),
            })
            definition!.dynamicUrlsApiEndpoint && sitemapSources[sitemapName].push({
              context: {
                name: `${sitemapName}:dynamicUrlsApiEndpoint`,
                description: `Generated from your ${sitemapName}:dynamicUrlsApiEndpoint config.`,
                tips: [
                  `You should switch to using the \`sitemaps.${sitemapName}.sources\` config which also supports fetch options.`,
                ],
              },
              fetch: definition!.dynamicUrlsApiEndpoint,
            })
            sitemapSources[sitemapName].push(...(definition.sources || [])
              .map((s) => {
                if (typeof s === 'string') {
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
        handler: resolve('./runtime/routes/sitemap.xsl'),
      })
      config.xsl = withBase(config.xsl, nuxt.options.app.baseURL)

      if (prerenderSitemap)
        addPrerenderRoutes(config.xsl)
    }

    // either this will redirect to sitemap_index or will render the main sitemap.xml
    addServerHandler({
      route: `/${config.sitemapName}`,
      handler: resolve('./runtime/routes/sitemap.xml'),
    })

    setupPrerenderHandler(runtimeConfig)
  },
})
