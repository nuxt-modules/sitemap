import { getQuery, setHeader } from 'h3'
import type { H3Event } from 'h3'
import { fixSlashes } from 'site-config-stack/urls'
import type { ModuleRuntimeConfig, NitroUrlResolvers, SitemapDefinition } from '../../types'
import { buildSitemap } from './builder/sitemap'
import { buildSitemapIndex } from './builder/sitemap-index'
import { createSitePathResolver, useNitroApp, useSiteConfig } from '#imports'

export function useNitroUrlResolvers(e: H3Event): NitroUrlResolvers {
  const canonicalQuery = getQuery(e).canonical
  const isShowingCanonical = typeof canonicalQuery !== 'undefined' && canonicalQuery !== 'false'
  const siteConfig = useSiteConfig(e)
  return {
    event: e,
    fixSlashes: (path: string) => fixSlashes(siteConfig.trailingSlash, path),
    // we need these as they depend on the nitro event
    canonicalUrlResolver: createSitePathResolver(e, {
      canonical: isShowingCanonical || !process.dev,
      absolute: true,
      withBase: true,
    }),
    relativeBaseUrlResolver: createSitePathResolver(e, { absolute: false, withBase: true }),
  }
}

export async function createSitemap(e: H3Event, definition: SitemapDefinition, runtimeConfig: ModuleRuntimeConfig) {
  const { sitemapName } = definition
  const nitro = useNitroApp()
  let sitemap = await (
    definition.sitemapName === 'index'
      ? buildSitemapIndex(useNitroUrlResolvers(e), runtimeConfig)
      : buildSitemap(definition, useNitroUrlResolvers(e), runtimeConfig)
  )
  const ctx = { sitemap, sitemapName }
  await nitro.hooks.callHook('sitemap:output', ctx)
  sitemap = ctx.sitemap
  // need to clone the config object to make it writable
  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (runtimeConfig.cacheMaxAgeSeconds)
    setHeader(e, 'Cache-Control', `public, max-age=${runtimeConfig.cacheMaxAgeSeconds}, must-revalidate`)
  else
    setHeader(e, 'Cache-Control', `no-cache, no-store`)
  e.context._isSitemap = true
  return sitemap
}
