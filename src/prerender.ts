import type { Nuxt } from '@nuxt/schema'
import type { ConsolaInstance } from 'consola'
import type { Nitro, PrerenderRoute } from 'nitropack'
import type { ModuleRuntimeConfig, SitemapUrl } from './runtime/types'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { MessageChannel, Worker } from 'node:worker_threads'
import { useNuxt } from '@nuxt/kit'
import { colors } from 'consola/utils'
import { defu } from 'defu'
import { withSiteUrl } from 'nuxt-site-config/kit'
import { dirname } from 'pathe'
import { withBase } from 'ufo'
import { splitForLocales } from './runtime/utils-pure'
import { isNuxtGenerate } from './utils-internal/kit'
import { parseHtmlExtractSitemapMeta } from './utils/parseHtmlExtractSitemapMeta'

function formatPrerenderRoute(route: PrerenderRoute) {
  let str = `  ├─ ${route.route} (${route.generateTimeMS}ms)`

  if (route.error) {
    const errorColor = colors[route.error.statusCode === 404 ? 'yellow' : 'red']
    const errorLead = '└──'
    str += `\n  │ ${errorLead} ${errorColor(route.error.message)}`
  }

  return colors.gray(str)
}

export function includesSitemapRoot(sitemapName: string, routes: string[]) {
  return routes.includes(`/__sitemap__/`) || routes.includes(`/sitemap.xml`) || routes.includes(`/${sitemapName}`) || routes.includes('/sitemap_index.xml')
}

const NuxtRedirectHtmlRegex = /<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=([^"]+)"><\/head><\/html>/ // eslint-disable-line regexp/no-unused-capturing-group

export function setupPrerenderHandler(_options: { runtimeConfig: ModuleRuntimeConfig, logger: ConsolaInstance, generateGlobalSources: () => Promise<any>, generateChildSources: () => Promise<any>, prerenderSitemap: boolean }, nuxt: Nuxt = useNuxt()) {
  const { runtimeConfig: options, logger, generateGlobalSources, generateChildSources, prerenderSitemap } = _options
  nuxt.options.nitro.prerender = nuxt.options.nitro.prerender || {}
  nuxt.options.nitro.prerender.routes = nuxt.options.nitro.prerender.routes || []
  const shouldHookIntoPrerender = prerenderSitemap || (nuxt.options.nitro.prerender.routes.length && nuxt.options.nitro.prerender.crawlLinks)
  if (isNuxtGenerate() && options.debug) {
    nuxt.options.nitro.prerender.routes.push('/__sitemap__/debug.json')
    logger.info('Adding debug route for sitemap generation:', colors.cyan('/__sitemap__/debug.json'))
  }
  // need to filter it out of the config as we render it after all other routes
  if (!shouldHookIntoPrerender) {
    return
  }
  nuxt.options.nitro.prerender.routes = nuxt.options.nitro.prerender.routes.filter(r => r && !includesSitemapRoot(options.sitemapName, [r]))

  const runtimeAssetsPath = join(nuxt.options.rootDir, 'node_modules/.cache/nuxt/sitemap')
  const localeCodes = options.autoI18n ? new Set(options.autoI18n.locales.map(l => l.code)) : undefined

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
    let prerendererNitro = nitro
    nitro.hooks.hook('prerender:init', (prerenderer) => {
      prerendererNitro = prerenderer
    })
    nitro.hooks.hook('prerender:generate', async (route) => {
      const html = route.contents
      // extract alternatives from the html
      if (!route.fileName?.endsWith('.html') || !html || ['/200.html', '/404.html'].includes(route.route))
        return
      // ignore redirects: mark explicitly excluded so the module's missing-`_sitemap`
      // fallback (`r._sitemap || { loc }`) doesn't resurface redirect routes (#624)
      if (NuxtRedirectHtmlRegex.test(html)) {
        route._sitemap = { loc: route.route, _sitemap: false }
        return
      }

      const extractedMeta = parseHtmlExtractSitemapMeta(html, {
        images: options.discoverImages,
        videos: options.discoverVideos,
        // TODO configurable?
        lastmod: true,
        // when autoI18n is enabled, let the sitemap builder generate alternatives
        // based on i18n config instead of extracting from HTML (which can be incomplete)
        // when autoI18n is explicitly disabled, don't extract alternatives from HTML at all
        alternatives: !options.autoI18n && !options.hasDisabledAutoI18n,
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
        const match = splitForLocales(path, localeCodes!)
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

      const sitemapEntry = options.isMultiSitemap
        ? '/sitemap_index.xml' // this route adds prerender hints for child sitemaps
        : `/${Object.keys(options.sitemaps)[0]}`
      const prerenderServer = await loadPrerenderServer(prerendererNitro)
      await prerenderSitemapsFromEntry(nitro, prerenderServer.fetch, sitemapEntry)
        .then(sitemaps => nuxt.hooks.callHook('sitemap:prerender:done' as any, { options, sitemaps }))
        .finally(prerenderServer.close)
    })
  })
}

type PrerenderFetch = (input: string, headers: Record<string, string>) => Promise<Response>

// CommonJS + dynamic import so the eval worker runs on every Node version
const PrerenderWorkerCode = `
const { parentPort, workerData } = require('node:worker_threads')

;(async () => {
  const serverEntry = await import(workerData.entry)
  const server = serverEntry.default
  const localFetch = serverEntry.localFetch
  const fetch = typeof server?.fetch === 'function'
    ? (input, headers) => server.fetch(new Request(new URL(input, 'http://localhost'), { headers }))
    : typeof localFetch === 'function'
      // older nitropack exposes an ofetch instance: a bare call returns parsed data, .raw returns the response
      ? (input, headers) => (localFetch.raw ?? localFetch)(input, { headers })
      : undefined
  const close = typeof server?.close === 'function'
    ? () => server.close()
    : typeof serverEntry.closePrerenderer === 'function'
      ? () => serverEntry.closePrerenderer()
      : async () => {}

  parentPort.postMessage(fetch ? { _tag: 'Ready' } : { _tag: 'Err', message: 'Nitro prerender server does not expose a fetch handler' })
  parentPort.on('message', ({ _tag, input, headers, port }) => {
    const task = _tag === 'Fetch'
      ? fetch(input, headers).then(async response => ({
          _tag: 'Ok',
          status: response.status,
          statusText: response.statusText,
          headers: [...response.headers],
          body: await response.arrayBuffer(),
        }))
      : close().then(() => ({ _tag: 'Ok' }))
    task.catch(error => ({ _tag: 'Err', message: error instanceof Error ? error.message : String(error) }))
      .then(result => port.postMessage(result, result.body ? [result.body] : []))
  })
})().catch(error => parentPort.postMessage({ _tag: 'Err', message: error instanceof Error ? error.message : String(error) }))
`

function raceWithTimeout<T>(promises: Promise<T>[], ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([...promises, timeout]).finally(() => clearTimeout(timer))
}

async function loadPrerenderServer(nitro: Nitro): Promise<{ fetch: PrerenderFetch, close: () => Promise<void> }> {
  const entryFileNames = nitro.options.rollupConfig?.output?.entryFileNames
  const serverFilename = typeof entryFileNames === 'string' ? entryFileNames : 'index.mjs'
  const worker = new Worker(PrerenderWorkerCode, {
    eval: true,
    workerData: { entry: pathToFileURL(resolve(nitro.options.output.serverDir, serverFilename)).href },
  })
  const workerDead = new Promise<never>((_, reject) => {
    worker.once('exit', code => reject(new Error(`The Nitro prerender server worker exited unexpectedly (code ${code})`)))
    worker.once('error', error => reject(error))
  })
  // the worker outlives individual calls; keep the rejection handled between calls
  workerDead.catch(() => {
    // rejection is observed by whichever callWorker or ready race is in flight
  })
  try {
    const [ready] = await raceWithTimeout([once(worker, 'message'), workerDead], 60_000, 'The Nitro prerender server did not become ready in time')
    if (ready._tag === 'Err')
      throw new Error(ready.message)
  }
  catch (error) {
    await worker.terminate()
    throw error
  }

  const callWorker = async (message: Record<string, unknown>) => {
    const { port1, port2 } = new MessageChannel()
    worker.postMessage({ ...message, port: port2 }, [port2])
    try {
      const [result] = await Promise.race([once(port1, 'message'), workerDead])
      if (result._tag === 'Err')
        throw new Error(result.message)
      return result
    }
    finally {
      port1.close()
    }
  }
  return {
    async fetch(input, headers) {
      const { _tag, body, ...responseInit } = await callWorker({ _tag: 'Fetch', input, headers })
      return new Response(body, responseInit)
    },
    async close() {
      // the worker is a build-time throwaway: bound the graceful close so a
      // prerender server with hanging close hooks cannot hang the generate
      try {
        await raceWithTimeout([callWorker({ _tag: 'Close' })], 3_000, 'The Nitro prerender server did not close in time')
      }
      catch {
        // the worker already exited or its close hooks hung; terminate below
      }
      await worker.terminate()
    },
  }
}

async function prerenderSitemapsFromEntry(nitro: Nitro, fetch: PrerenderFetch, entry: string) {
  const sitemaps: { name: string, get content(): string }[] = []
  const queue = [entry]
  const processed = new Set<string>()
  while (queue.length) {
    const route = queue.shift()!
    if (processed.has(route))
      continue
    processed.add(route)
    const { filePath, prerenderUrls } = await prerenderRoute(nitro, fetch, route)
    sitemaps.push({
      name: route,
      get content() {
        return readFileSync(filePath, { encoding: 'utf8' })
      },
    })
    queue.push(...prerenderUrls)
  }
  return sitemaps
}

export async function prerenderRoute(nitro: Nitro, fetch: PrerenderFetch, route: string) {
  const start = Date.now()
  const _route: PrerenderRoute = { route, fileName: route }
  const encodedRoute = encodeURI(route)
  const fetchUrl = withBase(encodedRoute, nitro.options.baseURL)
  const res = await fetch(fetchUrl, { 'x-nitro-prerender': encodedRoute })
  if (!res.ok)
    throw new Error(`Failed to prerender '${fetchUrl}': ${res.status} ${res.statusText}`)
  const header = (res.headers.get('x-nitro-prerender') || '') as string
  const prerenderUrls = header
    .split(',')
    .map(i => decodeURIComponent(i.trim()))
    .filter(Boolean)
  const filePath = join(nitro.options.output.publicDir, _route.fileName!)
  await mkdir(dirname(filePath), { recursive: true })
  const content = await res.text()
  await writeFile(filePath, content, 'utf8')
  _route.generateTimeMS = Date.now() - start
  nitro._prerenderedRoutes!.push(_route)
  nitro.logger.log(formatPrerenderRoute(_route))
  return { filePath, prerenderUrls }
}
