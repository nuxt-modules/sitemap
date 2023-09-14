import type { BuildSitemapInput } from '../../types'
import { normaliseSitemapData, resolveAsyncDataSources } from '../entries'
import { escapeValueForXml, wrapSitemapXml } from './util'

export async function buildSitemap(options: BuildSitemapInput) {
  const sitemapsConfig = options.moduleConfig.sitemaps
  // always fetch all sitemap data
  const sources = await resolveAsyncDataSources(options)
  // dedupes data
  let entries = await normaliseSitemapData(sources.map(e => e.urls).flat(), options)
  // if we're rendering a partial sitemap, slice the entries
  if (sitemapsConfig === true && options.moduleConfig.defaultSitemapsChunkSize)
    entries = entries.slice(Number(options.sitemap?.sitemapName) * options.moduleConfig.defaultSitemapsChunkSize, (Number(options.sitemap?.sitemapName) + 1) * options.moduleConfig.defaultSitemapsChunkSize)

  function resolveKey(k: string) {
    switch (k) {
      case 'images':
        return 'image'
      case 'videos':
        return 'video'
      // news & others?
      case 'news':
        return 'news'
      default:
        return k
    }
  }
  function handleObject(key: string, obj: Record<string, any>) {
    return [
      `        <${key}:${key}>`,
      ...Object.entries(obj).map(([sk, sv]) => {
        if (typeof sv === 'object') {
          return [
            `            <${key}:${sk}>`,
            ...Object.entries(sv).map(([ssk, ssv]) => `                <${key}:${ssk}>${escapeValueForXml(ssv)}</${key}:${ssk}>`),
            `            </${key}:${sk}>`,
          ].join('\n')
        }
        return `            <${key}:${sk}>${escapeValueForXml(sv)}</${key}:${sk}>`
      }),
      `        </${key}:${key}>`,
    ].join('\n')
  }

  function handleArray(key: string, arr: Record<string, any>[]) {
    if (arr.length === 0)
      return false
    key = resolveKey(key)
    if (key === 'alternatives') {
      return arr.map(obj => [
        `        <xhtml:link rel="alternate" ${Object.entries(obj).map(([sk, sv]) => `${sk}="${escapeValueForXml(sv)}"`).join(' ')} />`,
      ].join('\n')).join('\n')
    }
    return arr.map(obj => handleObject(key, obj)).join('\n')
  }
  function handleEntry(k: string, e: Record<string, any> | (string | Record<string, any>)[]) {
    // @ts-expect-error type juggling
    return Array.isArray(e[k]) ? handleArray(k, e[k]) : typeof e[k] === 'object' ? handleObject(k, e[k]) : `        <${k}>${escapeValueForXml(e[k])}</${k}>`
  }
  return wrapSitemapXml([
    '<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...(entries?.map(e => `    <url>
${Object.keys(e).map(k => handleEntry(k, e)).filter(l => l !== false).join('\n')}
    </url>`) ?? []),
    '</urlset>',
  ], {
    xsl: options.moduleConfig.xsl ? options.relativeBaseUrlResolver(options.moduleConfig.xsl) : false,
    credits: options.moduleConfig.credits,
    version: options.buildTimeMeta.version,
  })
}
