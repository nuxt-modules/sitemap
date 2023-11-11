import { createError, defineEventHandler } from 'h3'
import { parseURL } from 'ufo'
import type { ModuleRuntimeConfig } from '../types'
import { createSitemap } from '../sitemap/nitro'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (e) => {
  const path = parseURL(e.path).pathname
  if (!path.endsWith('-sitemap.xml'))
    return

  const { sitemaps } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig

  const sitemapName = path
    .replace('-sitemap.xml', '')
    .replace('/', '')
  // check if sitemapName can be cast to a number safely
  const isChunking = typeof sitemaps.chunks !== 'undefined' && !Number.isNaN(Number(sitemapName))
  if (!(sitemapName in sitemaps) && !isChunking) {
    return createError({
      statusCode: 404,
      message: `Sitemap "${sitemapName}" not found.`,
    })
  }
  return createSitemap(e, isChunking
    ? {
        ...sitemaps.chunks,
        sitemapName,
      }
    : sitemaps[sitemapName])
})
