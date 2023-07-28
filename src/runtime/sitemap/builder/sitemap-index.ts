import { defu } from 'defu'
import type {
  BuildSitemapIndexInput,
  SitemapEntry,
  SitemapIndexEntry,
  SitemapRoot,
} from '../../types'
import { normaliseDate, normaliseSitemapData, resolveAsyncDataSources } from '../entries'
import { escapeValueForXml, wrapSitemapXml } from './util'

export async function buildSitemapIndex(options: BuildSitemapIndexInput) {
  const multiSitemapConfig = options.moduleConfig.sitemaps
  if (!multiSitemapConfig)
    throw new Error('Attempting to build a sitemap index without required `sitemaps` configuration.')

  const chunks: Record<string | number, { urls: SitemapEntry[] }> = {}
  const rawEntries = await resolveAsyncDataSources(options)
  if (multiSitemapConfig === true) {
    // we need to generate multiple sitemaps with dynamically generated names
    const urls = await normaliseSitemapData(rawEntries.map(e => e.urls).flat(), options)
    // split into the max size which should be 1000
    urls.forEach((url, i) => {
      const chunkIndex = Math.floor(i / (options.moduleConfig.defaultSitemapsChunkSize as number))
      chunks[chunkIndex] = chunks[chunkIndex] || { urls: [] }
      chunks[chunkIndex].urls.push(url)
    })
  }
  else {
    for (const sitemap in multiSitemapConfig) {
      if (sitemap !== 'index') {
        // user provided sitemap config
        chunks[sitemap] = chunks[sitemap] || { urls: [] }
        chunks[sitemap].urls = await normaliseSitemapData(rawEntries.map(e => e.urls).flat(), defu({ sitemap: multiSitemapConfig[sitemap] }, options))
      }
    }
  }

  const entries: SitemapIndexEntry[] = []
  const sitemaps: SitemapRoot[] = []
  // normalise
  for (const sitemapName in chunks) {
    const sitemap = chunks[sitemapName]
    const entry: SitemapIndexEntry = {
      sitemap: options.canonicalUrlResolver(`${sitemapName}-sitemap.xml`),
    }
    let lastmod = sitemap.urls
      .filter(a => !!a?.lastmod)
      .map(a => typeof a.lastmod === 'string' ? new Date(a.lastmod) : a.lastmod)
      .sort((a?: Date, b?: Date) => (b?.getTime() || 0) - (a?.getTime() || 0))?.[0]
    if (!lastmod && options.moduleConfig.autoLastmod)
      lastmod = new Date()

    if (lastmod)
      entry.lastmod = normaliseDate(lastmod)
    entries.push(entry)
    sitemaps.push({
      sitemapName,
      urls: sitemap.urls,
    })
  }

  // allow extending the index sitemap
  if (multiSitemapConfig !== true && multiSitemapConfig.index) {
    entries.push(...multiSitemapConfig.index.map((s) => {
      return typeof s === 'string' ? { sitemap: s } : s
    }))
  }

  return {
    sitemaps,
    xml: generateSitemapIndexXml(entries, {
      xsl: options.moduleConfig.xsl ? options.relativeBaseUrlResolver(options.moduleConfig.xsl) : false,
      credits: options.moduleConfig.credits,
      version: options.buildTimeMeta.version,
    }),
  }
}

export function generateSitemapIndexXml(entries: SitemapIndexEntry[], options: { xsl: string | false; credits: boolean; version: string }) {
  const sitemapXml = entries.map(e => [
    '    <sitemap>',
    `        <loc>${escapeValueForXml(e.sitemap)}</loc>`,
    // lastmod is optional
    e.lastmod ? `        <lastmod>${escapeValueForXml(e.lastmod)}</lastmod>` : false,
    '    </sitemap>',
  ].filter(Boolean).join('\n')).join('\n')

  return wrapSitemapXml([
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    sitemapXml,
    '</sitemapindex>',
  ], options)
}
