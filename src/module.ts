import { mkdir, writeFile } from 'node:fs/promises'
import { statSync } from 'node:fs'
import {
  addPrerenderRoutes,
  addServerHandler,
  addServerPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
  findPath, isIgnored,
  useLogger,
} from '@nuxt/kit'
import { defu } from 'defu'
import { createRouter as createRadixRouter, toRouteMatcher } from 'radix3'
import chalk from 'chalk'
import { withBase, withoutBase, withoutTrailingSlash } from 'ufo'
import { globby } from 'globby'
import type { CreateFilterOptions } from './runtime/util/urlFilter'
import { buildSitemap, buildSitemapIndex } from './runtime/util/builder'
import type { NuxtSimpleSitemapRuntime, ResolvedSitemapEntry, SitemapEntry, SitemapFullEntry, SitemapRenderCtx, SitemapRoot } from './types'
import {
  generateRoutesFromFiles,
  normalisePagesForSitemap,
} from './runtime/util/pageUtils'

export * from './types'

export interface ModuleOptions extends CreateFilterOptions, SitemapRoot {
  /**
   * Whether the sitemap.xml should be generated.
   *
   * @default true
   */
  enabled: boolean
  /**
   * Should the URLs be inserted with a trailing slash.
   *
   * @default false
   */
  trailingSlash: boolean

  siteUrl: string

  autoLastmod: boolean
  inferStaticPagesAsRoutes: boolean
  sitemaps?: boolean | Record<string, Partial<SitemapRoot>>
  /**
   * @deprecated use `siteUrl`
   */
  hostname?: string
  /**
   * Path to the xsl that styles sitemap.xml.
   *
   * Set to `false` to disable styling.
   *
   * @default /__sitemap__/style.xsl
   */
  xsl: string | false
  /**
   * When prerendering, should images be automatically be discovered and added to the sitemap.
   *
   * @default true
   */
  discoverImages: boolean
  /**
   * Automatically add alternative links to the sitemap based on a prefix list.
   * Is used by @nuxtjs/i18n to automatically add alternative links to the sitemap.
   *
   * @default `false` or @nuxtjs/i18n `locales`
   */
  autoAlternativeLangPrefixes?: false | string[]
  /**
   * The endpoint to fetch dynamic URLs from.
   */
  dynamicUrlsApiEndpoint: string
}

export interface ModuleHooks {
  /**
   * @deprecated use `sitemap:prerender`
   */
  'sitemap:generate': (ctx: { urls: ResolvedSitemapEntry[] }) => Promise<void> | void
  'sitemap:prerender': (ctx: { urls: ResolvedSitemapEntry[] }) => Promise<void> | void
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-simple-sitemap',
    compatibility: {
      nuxt: '^3.3.1',
      bridge: false,
    },
    configKey: 'sitemap',
  },
  defaults(nuxt) {
    const trailingSlash = process.env.NUXT_PUBLIC_TRAILING_SLASH || nuxt.options.runtimeConfig.public.trailingSlash
    return {
      enabled: true,
      autoLastmod: true,
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || nuxt.options.runtimeConfig.public?.siteUrl,
      trailingSlash: String(trailingSlash) === 'true',
      inferStaticPagesAsRoutes: true,
      discoverImages: true,
      dynamicUrlsApiEndpoint: '/api/_sitemap-urls',
      // index sitemap options filtering
      include: [],
      exclude: [],
      urls: [],
      sitemaps: false,
      xsl: '/__sitemap__/style.xsl',
      defaults: {},
    }
  },
  async setup(config, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    // support v1 config fallbacks
    config.siteUrl = config.siteUrl || config.hostname!
    // add protocol in case they forgot
    if (config.siteUrl && !config.siteUrl.startsWith('http'))
      config.siteUrl = `https://${config.siteUrl}`

    // nuxt-simple-robots integration
    nuxt.hooks.hook('robots:config', (robotsConfig) => {
      robotsConfig.sitemap.push(
        withBase(config.sitemaps
          ? '/sitemap_index.xml'
          : '/sitemap.xml', config.siteUrl,
        ),
      )
    })

    // nuxt i18n integration
    // @ts-expect-error i18n schema issue
    const nuxtI18nConfig = nuxt.options.i18n as Record<string, any> | undefined
    if (nuxtI18nConfig?.pages) {
      config.inferStaticPagesAsRoutes = false
      for (const pageLocales of Object.values(nuxtI18nConfig?.pages as Record<string, Record<string, string>>)) {
        for (const locale in pageLocales) {
          // add root entry for default locale and ignore dynamic routes
          if (locale === nuxtI18nConfig?.defaultLocale && !pageLocales[locale].includes('[')) {
            // add to sitemap
            const alternatives = Object.keys(pageLocales).filter(l => l !== locale)
              .map(l => ({
                hreflang: l,
                href: pageLocales[l],
              }))
            if (Array.isArray(config.urls)) {
              config.urls.push({
                loc: pageLocales[locale],
                alternatives,
              })
            }
          }
        }
      }
    }
    else if (typeof config.autoAlternativeLangPrefixes === 'undefined' && nuxtI18nConfig?.locales) {
      if (nuxtI18nConfig?.strategy !== 'no_prefix') {
        const prefixes: string[] = []
        // @ts-expect-error i18n schema issue
        nuxt.options.i18n.locales.forEach((locale) => {
          const loc = typeof locale === 'string' ? locale : locale.code
          if (loc === nuxtI18nConfig.defaultLocale)
            return
          prefixes.push(loc)
        })
        config.autoAlternativeLangPrefixes = prefixes
      }
    }

    // paths.d.ts
    addTemplate({
      filename: 'nuxt-simple-sitemap.d.ts',
      getContents: () => {
        return `// Generated by nuxt-simple-sitemap
import type { SitemapItemDefaults } from 'nuxt-simple-sitemap'

interface NuxtSimpleSitemapNitroRules {
  index?: boolean
  sitemap?: SitemapItemDefaults
}
declare module 'nitropack' {
  interface NitroRouteRules extends NuxtSimpleSitemapNitroRules {}
  interface NitroRouteConfig extends NuxtSimpleSitemapNitroRules {}
}

export {}
`
      },
    })

    nuxt.hooks.hook('prepare:types', ({ references }) => {
      references.push({ path: resolve(nuxt.options.buildDir, 'nuxt-simple-sitemap.d.ts') })
    })

    let urls: SitemapEntry[] = []
    if (typeof config.urls === 'function')
      urls = [...await config.urls()]

    else if (Array.isArray(config.urls))
      urls = [...await config.urls]

    // check if the user provided route /api/_sitemap-urls exists
    const hasApiRoutesUrl = !!(await findPath(resolve(nuxt.options.serverDir, 'api/_sitemap-urls'))) || config.dynamicUrlsApiEndpoint !== '/api/_sitemap-urls'
    const isNuxtContentDocumentDriven = !!nuxt.options.content?.documentDriven || false

    nuxt.hooks.hook('modules:done', async () => {
      const pagesDirs = nuxt.options._layers.map(
        layer => resolve(layer.config.srcDir, layer.config.dir?.pages || 'pages'),
      )
      // need to resolve the page dirs up front when we're building
      if (nuxt.options.build) {
        let pagesRoutes: SitemapFullEntry[] = []
        if (config.inferStaticPagesAsRoutes) {
          // we need to more manually find the pages so we can mark the ones that are ignored
          const allRoutes = (await Promise.all(
            pagesDirs.map(async (dir) => {
              const files = (await globby(`**/*{${nuxt.options.extensions.join(',')}}`, { cwd: dir, followSymbolicLinks: true }))
                .map(p => resolve(dir, p))
                .filter((p) => {
                  if (isIgnored(p)) {
                    // add the page to the exclude config
                    config.exclude = config.exclude || []
                    config.exclude.push(generateRoutesFromFiles([p], dir)[0].path)
                    return false
                  }
                  return true
                }).sort()
              return generateRoutesFromFiles(files, dir)
            }),
          )).flat()

          pagesRoutes = normalisePagesForSitemap(allRoutes)
            .map((page) => {
              const entry = <SitemapFullEntry>{
                loc: page.path,
              }
              if (config.autoLastmod && page.file) {
                const stats = statSync(page.file)
                entry.lastmod = stats.mtime
              }
              return entry
            })
        }
        urls = [...urls, ...pagesRoutes]
      }
      const prerenderedRoutes = (nuxt.options.nitro.prerender?.routes || []) as string[]
      const generateStaticSitemap = nuxt.options._generate || prerenderedRoutes.includes('/sitemap.xml') || prerenderedRoutes.includes('/sitemap_index.xml')
      // @ts-expect-error untyped
      nuxt.options.runtimeConfig['nuxt-simple-sitemap'] = {
        ...config,
        isNuxtContentDocumentDriven,
        hasApiRoutesUrl,
        urls,
        pagesDirs,
        hasPrerenderedRoutesPayload: !nuxt.options.dev && !generateStaticSitemap,
        extensions: nuxt.options.extensions,
      } as NuxtSimpleSitemapRuntime
    })

    const prerenderedRoutes = (nuxt.options.nitro.prerender?.routes || []) as string[]
    const generateStaticSitemap = !nuxt.options.dev && (nuxt.options._generate || prerenderedRoutes.includes('/sitemap.xml') || prerenderedRoutes.includes('/sitemap_index.xml'))

    // always add the styles
    if (config.xsl === '/__sitemap__/style.xsl') {
      addServerHandler({
        route: config.xsl,
        handler: resolve('./runtime/routes/sitemap.xsl'),
      })
      config.xsl = withBase(config.xsl, nuxt.options.app.baseURL)

      if (generateStaticSitemap)
        addPrerenderRoutes(config.xsl)
    }

    // multi sitemap support
    if (config.sitemaps) {
      addServerHandler({
        route: '/sitemap_index.xml',
        handler: resolve('./runtime/routes/sitemap_index.xml'),
      })
      addServerHandler({
        handler: resolve('./runtime/middleware/[sitemap]-sitemap.xml'),
      })
    }
    // either this will redirect to sitemap_index or will render the main sitemap.xml
    addServerHandler({
      route: '/sitemap.xml',
      handler: resolve('./runtime/routes/sitemap.xml'),
    })
    if (isNuxtContentDocumentDriven) {
      addServerPlugin(resolve('./runtime/plugins/nuxt-content'))

      addServerHandler({
        route: '/api/__sitemap__/document-driven-urls',
        handler: resolve('./runtime/routes/document-driven-urls'),
      })
    }

    nuxt.hooks.hook('nitro:init', async (nitro) => {
      // tell the user if the sitemap isn't being generated
      const logger = useLogger('nuxt-simple-sitemap')
      if (!config.enabled) {
        logger.debug('Sitemap generation is disabled.')
        return
      }

      const sitemapImages: Record<string, { loc: string }[]> = {}
      // setup a hook for the prerender so we can inspect the image sources
      nitro.hooks.hook('prerender:route', async (ctx) => {
        const html = ctx.contents
        if (ctx.fileName?.endsWith('.html') && html) {
          // only scan within the <main> tag
          const mainRegex = /<main[^>]*>([\s\S]*?)<\/main>/
          const mainMatch = mainRegex.exec(html)
          if (!mainMatch)
            return
          if (config.discoverImages) {
            // extract image src using regex on the html
            const imgRegex = /<img[^>]+src="([^">]+)"/g
            let match
            // eslint-disable-next-line no-cond-assign
            while ((match = imgRegex.exec(mainMatch[1])) !== null) {
              const url = new URL(match[1], config.siteUrl)
              sitemapImages[ctx.route] = sitemapImages[ctx.route] || []
              sitemapImages[ctx.route].push({
                loc: url.href,
              })
            }
          }
        }
      })

      let sitemapGenerated = false
      const outputSitemap = async () => {
        if (sitemapGenerated || nuxt.options.dev || nuxt.options._prepare)
          return

        const prerenderRoutes = nitro._prerenderedRoutes?.filter(r => !r.route.includes('.'))
          .map(r => ({ url: r.route })) || []
        // @ts-expect-error untyped
        const configUrls = [...(new Set<string>([...prerenderRoutes, ...urls].map(r => typeof r === 'string' ? r : (r.url || r.loc))))]

        if (!generateStaticSitemap) {
          // for SSR we always need to generate the routes.json payload
          await mkdir(resolve(nitro.options.output.publicDir, '__sitemap__'), { recursive: true })
          await writeFile(resolve(nitro.options.output.publicDir, '__sitemap__/routes.json'), JSON.stringify(configUrls))
          nitro.logger.log(chalk.gray(
            '  ├─ /__sitemap__/routes.json (0ms)',
          ))
          return
        }

        sitemapGenerated = true

        // we need a siteUrl set for pre-rendering
        if (!config.siteUrl) {
          logger.error('Please set a `siteUrl` on the `sitemap` config to use `nuxt-simple-sitemap`.')
          return
        }
        let start = Date.now()

        const _routeRulesMatcher = toRouteMatcher(
          createRadixRouter({ routes: nitro.options.routeRules }),
        )

        const routeMatcher = (path: string) => {
          const matchedRoutes = _routeRulesMatcher.matchAll(withoutBase(withoutTrailingSlash(path), nuxt.options.app.baseURL)).reverse()
          // inject our discovered images
          if (sitemapImages[path]) {
            matchedRoutes.push({
              sitemap: {
                images: sitemapImages[path],
              },
            })
          }
          return defu({}, ...matchedRoutes) as Record<string, any>
        }

        const callHook = async (ctx: SitemapRenderCtx) => {
          // deprecated hook
          // @ts-expect-error runtime type
          await nuxt.hooks.callHook('sitemap:generate', ctx)
          // @ts-expect-error runtime type
          await nuxt.hooks.callHook('sitemap:prerender', ctx)
        }

        const sitemapConfig: NuxtSimpleSitemapRuntime = {
          ...config,
          hasApiRoutesUrl,
          isNuxtContentDocumentDriven,
          urls: configUrls,
          hasPrerenderedRoutesPayload: !generateStaticSitemap,
        }

        if (process.dev || process.env.prerender) {
          sitemapConfig.pagesDirs = nuxt.options._layers.map(
            layer => resolve(layer.config.srcDir, layer.config.dir?.pages || 'pages'),
          )
          sitemapConfig.extensions = nuxt.options.extensions
        }

        if (config.sitemaps) {
          start = Date.now()

          // rendering a sitemap_index
          const { xml, sitemaps } = await buildSitemapIndex({
            sitemapConfig,
            baseURL: nuxt.options.app.baseURL,
            getRouteRulesForPath: routeMatcher,
            callHook,
          })
          await writeFile(resolve(nitro.options.output.publicDir, 'sitemap_index.xml'), xml)
          const generateTimeMS = Date.now() - start
          nitro.logger.log(chalk.gray(
            `  ├─ /sitemap_index.xml (${generateTimeMS}ms)`,
          ))
          let sitemapNames = Object.keys(config.sitemaps)
          if (config.sitemaps === true)
            sitemapNames = sitemaps.map(s => s.sitemap.split('/').pop()?.replace('-sitemap.xml', '')).filter(Boolean) as string[]

          // now generate all sub sitemaps
          for (const sitemap of sitemapNames) {
            const sitemapXml = await buildSitemap({
              sitemapName: sitemap,
              // @ts-expect-error untyped
              sitemapConfig: { ...defu(sitemapConfig.sitemaps[sitemap], sitemapConfig), urls: configUrls },
              baseURL: nuxt.options.app.baseURL,
              getRouteRulesForPath: routeMatcher,
              callHook,
            })
            await writeFile(resolve(nitro.options.output.publicDir, `${sitemap}-sitemap.xml`), sitemapXml)
            const generateTimeMS = Date.now() - start
            const isLastEntry = Object.keys(config.sitemaps).indexOf(sitemap) === Object.keys(config.sitemaps).length - 1
            nitro.logger.log(chalk.gray(
              `  ${isLastEntry ? '└─' : '├─'} /${sitemap}-sitemap.xml (${generateTimeMS}ms)`,
            ))
          }
        }
        else {
          const sitemapXml = await buildSitemap({
            sitemapName: 'sitemap',
            sitemapConfig,
            baseURL: nuxt.options.app.baseURL,
            getRouteRulesForPath: routeMatcher,
            callHook,
          })
          await writeFile(resolve(nitro.options.output.publicDir, 'sitemap.xml'), sitemapXml)
          const generateTimeMS = Date.now() - start
          nitro.logger.log(chalk.gray(
            `  └─ /sitemap.xml (${generateTimeMS}ms)`,
          ))
        }
      }

      // SSR mode
      nitro.hooks.hook('rollup:before', async () => {
        await outputSitemap()
      })

      // SSG mode
      nitro.hooks.hook('close', async () => {
        await outputSitemap()
      })
    })
  },
})
