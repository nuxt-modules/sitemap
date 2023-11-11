import { type H3Event, getQuery, setHeader } from 'h3'
import type { SitemapDefinition } from '../types'
import { buildSitemap } from './builder/sitemap'
import { buildSitemapIndex } from './builder/sitemap-index'
import { createSitePathResolver, useNitroApp } from '#imports'

export function useNitroUrlResolvers(e: H3Event) {
  const canonicalQuery = getQuery(e).canonical
  const isShowingCanonical = typeof canonicalQuery !== 'undefined' && canonicalQuery !== 'false'
  return {
    // we need these as they depend on the nitro event
    canonicalUrlResolver: createSitePathResolver(e, {
      canonical: isShowingCanonical || !process.dev,
      absolute: true,
      withBase: true,
    }),
    relativeBaseUrlResolver: createSitePathResolver(e, { absolute: false, withBase: true }),
  }
}

export async function createSitemap(e: H3Event, definition: SitemapDefinition) {
  const { sitemapName } = definition
  const nitro = useNitroApp()
  let sitemap = await (
    definition.sitemapName === 'index'
      ? buildSitemapIndex(useNitroUrlResolvers(e))
      : buildSitemap(definition, useNitroUrlResolvers(e))
  )
  const ctx = { sitemap, sitemapName }
  await nitro.hooks.callHook('sitemap:output', ctx)
  sitemap = ctx.sitemap
  // need to clone the config object to make it writable
  setHeader(e, 'Content-Type', 'text/xml; charset=UTF-8')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')
  return sitemap
}
