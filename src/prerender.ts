import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { withBase } from 'ufo'
import { assertSiteConfig } from 'nuxt-site-config-kit'
import { useNuxt } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { Nitro, PrerenderRoute } from 'nitropack'
import chalk from 'chalk'
import { dirname } from 'pathe'
import { build } from 'nitropack'
import { defu } from 'defu'
import { extractSitemapMetaFromHtml } from './util/extractSitemapMetaFromHtml'
import type { ModuleRuntimeConfig, SitemapUrl } from './runtime/types'
import { splitForLocales } from './runtime/utils-pure'

function formatPrerenderRoute(route: PrerenderRoute) {
  let str = `  ├─ ${route.route} (${route.generateTimeMS}ms)`

  if (route.error) {
    const errorColor = chalk[route.error.statusCode === 404 ? 'yellow' : 'red']
    const errorLead = '└──'
    str += `\n  │ ${errorLead} ${errorColor(route.error)}`
  }

  return chalk.gray(str)
}

declare module 'nitropack' {
  interface PrerenderRoute {
    _sitemap?: SitemapUrl
  }
}

export function includesSitemapRoot(sitemapName: string, routes: string[]) {
  return routes.includes(`/sitemap.xml`) || routes.includes(`/${sitemapName}`) || routes.includes('/sitemap_index.xml')
}

export function isNuxtGenerate(nuxt: Nuxt = useNuxt()) {
  return nuxt.options._generate || nuxt.options.nitro.static || nuxt.options.nitro.preset === 'static'
}

export function setupPrerenderHandler(options: ModuleRuntimeConfig, nuxt: Nuxt = useNuxt()) {
  const prerenderedRoutes = (nuxt.options.nitro.prerender?.routes || []) as string[]
  const prerenderSitemap = isNuxtGenerate() || includesSitemapRoot(options.sitemapName, prerenderedRoutes)
  // need to filter it out of the config as we render it after all other routes
  if (nuxt.options.nitro.prerender?.routes)
    nuxt.options.nitro.prerender.routes = nuxt.options.nitro.prerender.routes.filter(r => r && !includesSitemapRoot(options.sitemapName, [r]))
  nuxt.hooks.hook('nitro:init', async (nitro) => {
    let prerenderer: Nitro
    nitro.hooks.hook('prerender:init', async (_prerenderer: Nitro) => {
      prerenderer = _prerenderer
      assertSiteConfig('@nuxtjs/sitemap', {
        url: 'Required to generate absolute canonical URLs for your sitemap.',
      }, { throwError: false })
    })
    nitro.hooks.hook('prerender:generate', async (route) => {
      const html = route.contents
      // extract alternatives from the html
      if (!route.fileName?.endsWith('.html') || !html)
        return

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
          const { code, iso } = options.autoI18n.locales.find(l => l.code === locale) || { code: locale, iso: locale }
          // this will filter the results to only the sitemap that matches the locale
          route._sitemap._sitemap = iso || code
        }
      }
      route._sitemap = defu(extractSitemapMetaFromHtml(html, {
        images: options.discoverImages,
        // TODO configurable?
        lastmod: true,
        alternatives: true,
      }), route._sitemap) as SitemapUrl
    })
    nitro.hooks.hook('prerender:done', async () => {
      // force templates to be rebuilt
      await build(prerenderer)

      const routes: string[] = []
      if (options.debug)
        routes.push('/__sitemap__/debug.json')
      if (prerenderSitemap) {
        routes.push(
          options.isMultiSitemap
            ? '/sitemap_index.xml' // this route adds prerender hints for child sitemaps
            : `/${Object.keys(options.sitemaps)[0]}`,
        )
      }
      for (const route of routes)
        await prerenderRoute(nitro, route)
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
