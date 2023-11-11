import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseURL, withBase, withoutLeadingSlash } from 'ufo'
import { assertSiteConfig } from 'nuxt-site-config-kit'
import { useNuxt } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { Nitro, PrerenderRoute } from 'nitropack'
import chalk from 'chalk'
import { dirname } from 'pathe'
import { build } from 'nitropack'
import { extractImages } from './util/extractImages'
import type { ModuleRuntimeConfig, ResolvedSitemapUrl, SitemapUrl } from '~/src/runtime/types'

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

export function setupPrerenderHandler(options: ModuleRuntimeConfig, nuxt: Nuxt = useNuxt()) {
  const prerenderedRoutes = (nuxt.options.nitro.prerender?.routes || []) as string[]
  const prerenderSitemap = nuxt.options._generate || prerenderedRoutes.includes(`/${options.sitemapName}`) || prerenderedRoutes.includes('/sitemap_index.xml')

  nuxt.hooks.hook('nitro:init', async (nitro) => {
    let prerenderer: Nitro
    nitro.hooks.hook('prerender:init', async (_prerenderer: Nitro) => {
      prerenderer = _prerenderer
      assertSiteConfig('nuxt-simple-sitemap', {
        url: 'Required to generate absolute canonical URLs for your sitemap.',
      }, { throwError: false })
    })
    nitro.hooks.hook('prerender:generate', async (route) => {
      const html = route.contents
      // extract alternatives from the html
      if (!route.fileName?.endsWith('.html') || !html)
        return

      route._sitemap = {
        loc: route.route,
      }
      // we need to figure out which sitemap this belongs to
      if (options.autoI18n && Object.keys(options.sitemaps).length > 1) {
        const path = route.route
        const match = path.match(new RegExp(`^/(${options.autoI18n.locales.map(l => l.code).join('|')})(.*)`))
        // if it's missing a locale then we put it in the default locale sitemap
        let locale = options.autoI18n.defaultLocale
        if (match)
          locale = match[1]
        if (options.isI18nMapped) {
          const { code, iso } = options.autoI18n.locales.find(l => l.code === locale) || { code: locale, iso: locale }
          // this will filter the results to only the sitemap that matches the locale
          route._sitemap._sitemap = iso || code
        }
      }
      // do a loose regex match, get all alternative link lines
      const alternatives = (html.match(/<link[^>]+rel="alternate"[^>]+>/g) || [])
        .map((a) => {
          // extract the href, lang and type from the link
          const href = a.match(/href="([^"]+)"/)?.[1]
          const hreflang = a.match(/hreflang="([^"]+)"/)?.[1]
          return { hreflang, href: parseURL(href).pathname }
        })
        .filter(a => a.hreflang && a.href) as ResolvedSitemapUrl['alternatives']
      if (alternatives?.length && (alternatives.length > 1 || alternatives?.[0].hreflang !== 'x-default'))
        route._sitemap.alternatives = alternatives

      if (options.discoverImages) {
        route._sitemap.images = <Required<ResolvedSitemapUrl>['images']>[...extractImages(html)]
          .map(loc => ({ loc }))
      }
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
  const _route: PrerenderRoute = { route, fileName: withoutLeadingSlash(route) }
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
