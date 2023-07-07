import type { BuildSitemapInput, SitemapRenderCtx } from '../../types'
import { normaliseSitemapData, resolveAsyncDataSources } from '../entries'
import { MaxSitemapSize } from '../const'
import { escapeValueForXml, wrapSitemapXml } from './util'

export async function buildSitemap(options: BuildSitemapInput) {
  const sitemapsConfig = options.moduleConfig.sitemaps
  // always fetch all sitemap data
  const sources = await resolveAsyncDataSources(options)
  // dedupes data
  let entries = await normaliseSitemapData(sources.map(e => e.urls).flat(), options)
  // if we're rendering a partial sitemap, slice the entries
  if (sitemapsConfig === true)
    entries = entries.slice(Number(options.sitemap?.sitemapName) * MaxSitemapSize, (Number(options.sitemap?.sitemapName) + 1) * MaxSitemapSize)

  const ctx: SitemapRenderCtx = { urls: entries, sitemapName: options?.sitemap?.sitemapName || 'sitemap' }
  await options.callHook?.(ctx)
  const resolveKey = (k: string) => {
    switch (k) {
      case 'images':
        return 'image'
      case 'videos':
        return 'video'
      // news & others?
      default:
        return k
    }
  }
  const handleArray = (key: string, arr: Record<string, any>[]) => {
    if (arr.length === 0)
      return false
    key = resolveKey(key)
    if (key === 'alternatives') {
      return arr.map(obj => [
        `        <xhtml:link rel="alternate" ${Object.entries(obj).map(([sk, sv]) => `${sk}="${escapeValueForXml(sv)}"`).join(' ')} />`,
      ].join('\n')).join('\n')
    }
    return arr.map(obj => [
      `        <${key}:${key}>`,
      ...Object.entries(obj).map(([sk, sv]) => `            <${key}:${sk}>${escapeValueForXml(sv)}</${key}:${sk}>`),
      `        </${key}:${key}>`,
    ].join('\n')).join('\n')
  }
  return wrapSitemapXml([
    '<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...(ctx.urls?.map(e => `    <url>
${Object.keys(e).map(k => Array.isArray(e[k]) ? handleArray(k, e[k]) : `        <${k}>${escapeValueForXml(e[k])}</${k}>`).filter(l => l !== false).join('\n')}
    </url>`) ?? []),
    '</urlset>',
  ], {
    xsl: options.relativeBaseUrlResolver(options.moduleConfig.xsl),
    credits: options.moduleConfig.credits,
    version: options.buildTimeMeta.version,
  })
}
