import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { withBase } from 'ufo'
import { useNuxt } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { Nitro, PrerenderRoute } from 'nitropack'
import chalk from 'chalk'
import { dirname } from 'pathe'
import { defu } from 'defu'
import type { ConsolaInstance } from 'consola'
import { withSiteUrl } from 'nuxt-site-config/kit'
import { parseHtmlExtractSitemapMeta } from './utils/parseHtmlExtractSitemapMeta'
import type { ModuleRuntimeConfig, SitemapUrl } from './runtime/types'
import { splitForLocales } from './runtime/utils-pure'
import { resolveNitroPreset } from './utils-internal/kit'

function formatPrerenderRoute(route: PrerenderRoute) {
  let str = `  ├─ ${route.route} (${route.generateTimeMS}ms)`

  if (route.error) {
    const errorColor = chalk[route.error.statusCode === 404 ? 'yellow' : 'red']
    const errorLead = '└──'
    str += `\n  │ ${errorLead} ${errorColor(route.error)}`
  }

  return chalk.gray(str)
}

export function includesSitemapRoot(sitemapName: string, routes: string[]) {
  return routes.includes(`/__sitemap__/`) || routes.includes(`/sitemap.xml`) || routes.includes(`/${sitemapName}`) || routes.includes('/sitemap_index.xml')
}

export function isNuxtGenerate(nuxt: Nuxt = useNuxt()) {
  return nuxt.options.nitro.static || (nuxt.options as any)._generate /* TODO: remove in future */ || [
    'static',
    'github-pages',
  ].includes(resolveNitroPreset())
}

const NuxtRedirectHtmlRegex = /<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=([^"]+)"><\/head><\/html>/

export function setupPrerenderHandler(_options: { runtimeConfig: ModuleRuntimeConfig, logger: ConsolaInstance, generateGlobalSources: () => Promise<any>, generateChildSources: () => Promise<any> }, nuxt: Nuxt = useNuxt()) {
  const { runtimeConfig: options, logger, generateGlobalSources, generateChildSources } = _options
  const prerenderedRoutes = (nuxt.options.nitro.prerender?.routes || []) as string[]
  let prerenderSitemap = isNuxtGenerate() || includesSitemapRoot(options.sitemapName, prerenderedRoutes)
  if (resolveNitroPreset() === 'vercel-edge') {
    logger.warn('Runtime sitemaps are not supported on Vercel Edge, falling back to prerendering sitemaps.')
    prerenderSitemap = true
  }
  nuxt.options.nitro.prerender = nuxt.options.nitro.prerender || {}
  nuxt.options.nitro.prerender.routes = nuxt.options.nitro.prerender.routes || []
  const shouldHookIntoPrerender = prerenderSitemap || (nuxt.options.nitro.prerender.routes.length && nuxt.options.nitro.prerender.crawlLinks)
  if (isNuxtGenerate() && options.debug) {
    nuxt.options.nitro.prerender.routes.push('/__sitemap__/debug.json')
    logger.info('Adding debug route for sitemap generation:', chalk.cyan('/__sitemap__/debug.json'))
  }
  // need to filter it out of the config as we render it after all other routes
  if (!shouldHookIntoPrerender) {
    return
  }
  nuxt.options.nitro.prerender.routes = nuxt.options.nitro.prerender.routes.filter(r => r && !includesSitemapRoot(options.sitemapName, [r]))

  const runtimeAssetsPath = join(nuxt.options.rootDir, 'node_modules/.cache/nuxt/sitemap')

  // Setup virtual module for reading sources - must be in nitro:config to be bundled
  nuxt.hooks.hook('nitro:config', (nitroConfig) => {
    nitroConfig.virtual = nitroConfig.virtual || {}
    nitroConfig.virtual['#sitemap-virtual/read-sources.mjs'] = `
import { readFile } from 'node:fs/promises'
import { join } from 'pathe'

export async function readSourcesFromFilesystem(filename) {
  if (!import.meta.prerender) {
    return null
  }
  const path = join(${JSON.stringify(runtimeAssetsPath)}, filename)
  const data = await readFile(path, 'utf-8').catch(() => null)
  return data ? JSON.parse(data) : null
}
`
  })

  nuxt.hooks.hook('nitro:init', async (nitro) => {
    nitro.hooks.hook('prerender:generate', async (route) => {
      const html = route.contents
      // extract alternatives from the html
      if (!route.fileName?.endsWith('.html') || !html || ['/200.html', '/404.html'].includes(route.route))
        return
      // ignore redirects
      if (html.match(NuxtRedirectHtmlRegex)) {
        return
      }

      const extractedMeta = parseHtmlExtractSitemapMeta(html, {
        images: options.discoverImages,
        videos: options.discoverVideos,
        // TODO configurable?
        lastmod: true,
        alternatives: true,
        resolveUrl(s) {
          // if the match is relative
          return s.startsWith('/') ? withSiteUrl(s) : s
        },
      })

      // skip if route is blocked from indexing
      if (extractedMeta === null) {
        route._sitemap = {
          loc: route.route,
          _sitemap: false,
        }
        return
      }

      // maybe the user already provided a _sitemap on the route
      route._sitemap = defu(route._sitemap, {
        loc: route.route,
      })
      // we need to figure out which sitemap this belongs to
      if (options.autoI18n && Object.keys(options.sitemaps).length > 1) {
        const path = route.route
        const match = splitForLocales(path, options.autoI18n.locales.map(l => l.code))
        // if it's missing a locale then we put it in the default locale sitemap
        const locale = match[0] || options.autoI18n.defaultLocale
        if (options.isI18nMapped) {
          const { _sitemap } = options.autoI18n.locales.find(l => l.code === locale) || { _sitemap: locale }
          // this will filter the results to only the sitemap that matches the locale
          route._sitemap._sitemap = _sitemap
        }
      }

      route._sitemap = defu(extractedMeta, route._sitemap) as SitemapUrl
    })
    nitro.hooks.hook('prerender:done', async () => {
      const globalSources = await generateGlobalSources()
      const childSources = await generateChildSources()

      // Write to filesystem for prerender consumption
      await mkdir(runtimeAssetsPath, { recursive: true })
      await writeFile(join(runtimeAssetsPath, 'global-sources.json'), JSON.stringify(globalSources))
      await writeFile(join(runtimeAssetsPath, 'child-sources.json'), JSON.stringify(childSources))

      await prerenderRoute(nitro, options.isMultiSitemap
        ? '/sitemap_index.xml' // this route adds prerender hints for child sitemaps
        : `/${Object.keys(options.sitemaps)[0]}`)
    })
  })
}

async function prerenderRoute(nitro: Nitro, route: string) {
  const start = Date.now()
  // Create result object
  const _route: PrerenderRoute = { route, fileName: route }
  // Fetch the route
  const encodedRoute = encodeURI(route)
  const res = await globalThis.$fetch.raw(
    withBase(encodedRoute, nitro.options.baseURL),
    {
      headers: { 'x-nitro-prerender': encodedRoute },
      retry: nitro.options.prerender.retry,
      retryDelay: nitro.options.prerender.retryDelay,
    },
  )
  const header = (res.headers.get('x-nitro-prerender') || '') as string
  const prerenderUrls = [...header
    .split(',')
    .map(i => i.trim())
    .map(i => decodeURIComponent(i))
    .filter(Boolean),
  ]
  const filePath = join(nitro.options.output.publicDir, _route.fileName!)
  await mkdir(dirname(filePath), { recursive: true })
  const data = res._data
  if (filePath.endsWith('json') || typeof data === 'object')
    await writeFile(filePath, JSON.stringify(data), 'utf8')
  else
    await writeFile(filePath, data, 'utf8')
  _route.generateTimeMS = Date.now() - start
  nitro._prerenderedRoutes!.push(_route)
  nitro.logger.log(formatPrerenderRoute(_route))
  for (const url of prerenderUrls)
    await prerenderRoute(nitro, url)
}
