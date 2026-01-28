import { withQuery } from 'ufo'
import type { ModuleRuntimeConfig, NitroUrlResolvers, ResolvedSitemapUrl } from '../../../types'
import { xmlEscape } from '../../utils'

export function escapeValueForXml(value: boolean | string | number): string {
  if (value === true || value === false)
    return value ? 'yes' : 'no'
  return xmlEscape(String(value))
}

const yesNo = (v: boolean | string) =>
  v === 'yes' || v === true ? 'yes' : 'no'

const URLSET_OPENING_TAG = '<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'

function buildUrlXml(url: ResolvedSitemapUrl, NL: string, I1: string, I2: string, I3: string, I4: string): string {
  let xml = `${I1}<url>${NL}`

  if (url.loc) xml += `${I2}<loc>${xmlEscape(url.loc)}</loc>${NL}`
  if (url.lastmod) xml += `${I2}<lastmod>${url.lastmod}</lastmod>${NL}`
  if (url.changefreq) xml += `${I2}<changefreq>${url.changefreq}</changefreq>${NL}`
  if (url.priority !== undefined) {
    const p = typeof url.priority === 'number' ? url.priority : Number.parseFloat(url.priority)
    xml += `${I2}<priority>${p.toFixed(1)}</priority>${NL}`
  }

  if (url.alternatives) {
    for (const alt of url.alternatives) {
      let attrs = ''
      for (const [k, v] of Object.entries(alt)) attrs += ` ${k}="${xmlEscape(String(v))}"`
      xml += `${I2}<xhtml:link rel="alternate"${attrs} />${NL}`
    }
  }

  if (url.images) {
    for (const img of url.images) {
      xml += `${I2}<image:image>${NL}${I3}<image:loc>${xmlEscape(img.loc as string)}</image:loc>${NL}`
      if (img.title) xml += `${I3}<image:title>${xmlEscape(img.title)}</image:title>${NL}`
      if (img.caption) xml += `${I3}<image:caption>${xmlEscape(img.caption)}</image:caption>${NL}`
      if (img.geo_location) xml += `${I3}<image:geo_location>${xmlEscape(img.geo_location)}</image:geo_location>${NL}`
      if (img.license) xml += `${I3}<image:license>${xmlEscape(img.license as string)}</image:license>${NL}`
      xml += `${I2}</image:image>${NL}`
    }
  }

  if (url.videos) {
    for (const video of url.videos) {
      xml += `${I2}<video:video>${NL}${I3}<video:title>${xmlEscape(video.title)}</video:title>${NL}`
      if (video.thumbnail_loc) xml += `${I3}<video:thumbnail_loc>${xmlEscape(video.thumbnail_loc as string)}</video:thumbnail_loc>${NL}`
      xml += `${I3}<video:description>${xmlEscape(video.description)}</video:description>${NL}`
      if (video.content_loc) xml += `${I3}<video:content_loc>${xmlEscape(video.content_loc as string)}</video:content_loc>${NL}`
      if (video.player_loc) xml += `${I3}<video:player_loc>${xmlEscape(video.player_loc as string)}</video:player_loc>${NL}`
      if (video.duration !== undefined) xml += `${I3}<video:duration>${video.duration}</video:duration>${NL}`
      if (video.expiration_date) xml += `${I3}<video:expiration_date>${video.expiration_date}</video:expiration_date>${NL}`
      if (video.rating !== undefined) xml += `${I3}<video:rating>${video.rating}</video:rating>${NL}`
      if (video.view_count !== undefined) xml += `${I3}<video:view_count>${video.view_count}</video:view_count>${NL}`
      if (video.publication_date) xml += `${I3}<video:publication_date>${video.publication_date}</video:publication_date>${NL}`
      if (video.family_friendly !== undefined) xml += `${I3}<video:family_friendly>${yesNo(video.family_friendly)}</video:family_friendly>${NL}`
      if (video.restriction) xml += `${I3}<video:restriction relationship="${video.restriction.relationship || 'allow'}">${xmlEscape(video.restriction.restriction)}</video:restriction>${NL}`
      if (video.platform) xml += `${I3}<video:platform relationship="${video.platform.relationship || 'allow'}">${xmlEscape(video.platform.platform)}</video:platform>${NL}`
      if (video.requires_subscription !== undefined) xml += `${I3}<video:requires_subscription>${yesNo(video.requires_subscription)}</video:requires_subscription>${NL}`
      if (video.price) {
        for (const price of video.price) {
          const c = price.currency ? ` currency="${price.currency}"` : ''
          const t = price.type ? ` type="${price.type}"` : ''
          xml += `${I3}<video:price${c}${t}>${xmlEscape(String(price.price ?? ''))}</video:price>${NL}`
        }
      }
      if (video.uploader) {
        const info = video.uploader.info ? ` info="${xmlEscape(video.uploader.info as string)}"` : ''
        xml += `${I3}<video:uploader${info}>${xmlEscape(video.uploader.uploader)}</video:uploader>${NL}`
      }
      if (video.live !== undefined) xml += `${I3}<video:live>${yesNo(video.live)}</video:live>${NL}`
      if (video.tag) {
        const tags = Array.isArray(video.tag) ? video.tag : [video.tag]
        for (const t of tags) xml += `${I3}<video:tag>${xmlEscape(t)}</video:tag>${NL}`
      }
      if (video.category) xml += `${I3}<video:category>${xmlEscape(video.category)}</video:category>${NL}`
      if (video.gallery_loc) xml += `${I3}<video:gallery_loc>${xmlEscape(video.gallery_loc as string)}</video:gallery_loc>${NL}`
      xml += `${I2}</video:video>${NL}`
    }
  }

  if (url.news) {
    xml += `${I2}<news:news>${NL}${I3}<news:publication>${NL}`
    xml += `${I4}<news:name>${xmlEscape(url.news.publication.name)}</news:name>${NL}`
    xml += `${I4}<news:language>${xmlEscape(url.news.publication.language)}</news:language>${NL}`
    xml += `${I3}</news:publication>${NL}`
    if (url.news.title) xml += `${I3}<news:title>${xmlEscape(url.news.title)}</news:title>${NL}`
    if (url.news.publication_date) xml += `${I3}<news:publication_date>${url.news.publication_date}</news:publication_date>${NL}`
    xml += `${I2}</news:news>${NL}`
  }

  if (import.meta.dev && url._warnings?.length) {
    for (const w of url._warnings)
      xml += `${I2}<!-- WARN: ${w} -->${NL}`
  }

  xml += `${I1}</url>`
  return xml
}

export function urlsToXml(
  urls: ResolvedSitemapUrl[],
  resolvers: NitroUrlResolvers,
  { version, xsl, credits, minify }: Pick<ModuleRuntimeConfig, 'version' | 'xsl' | 'credits' | 'minify'>,
  errorInfo?: { messages: string[], urls: string[] },
): string {
  let xslHref = xsl ? resolvers.relativeBaseUrlResolver(xsl) : false

  if (xslHref && errorInfo?.messages.length) {
    xslHref = withQuery(xslHref, {
      errors: 'true',
      error_messages: errorInfo.messages,
      error_urls: errorInfo.urls,
    })
  }

  const NL = minify ? '' : '\n'
  const I1 = minify ? '' : '    '
  const I2 = minify ? '' : '        '
  const I3 = minify ? '' : '            '
  const I4 = minify ? '' : '                '

  let xml = xslHref
    ? `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="${escapeValueForXml(xslHref)}"?>${NL}`
    : `<?xml version="1.0" encoding="UTF-8"?>${NL}`

  xml += URLSET_OPENING_TAG + NL

  for (const url of urls) {
    xml += buildUrlXml(url, NL, I1, I2, I3, I4) + NL
  }

  xml += '</urlset>'

  if (credits) {
    xml += `${NL}<!-- XML Sitemap generated by @nuxtjs/sitemap v${version} at ${new Date().toISOString()} -->`
  }

  return xml
}
