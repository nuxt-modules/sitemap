import type { SitemapUrlInput } from '../../../types'
import { extractSitemapXMLFast } from './fast-xml-parser'

export function extractSitemapXML(xml: string): SitemapUrlInput[] {
  // Use fast parser for large XML files
  if (xml.length > 50000) {
    return extractSitemapXMLFast(xml)
  }

  // Use regex parser for smaller files (more compatible)
  const urls = xml.match(/<url>[\s\S]*?<\/url>/g) || []
  return urls.map((url) => {
    const loc = url.match(/<loc>([^<]+)<\/loc>/)?.[1]
    if (!loc) return null

    const lastmod = url.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]
    const changefreq = url.match(/<changefreq>([^<]+)<\/changefreq>/)?.[1]
    const priority = url.match(/<priority>([^<]+)<\/priority>/) ? Number.parseFloat(url.match(/<priority>([^<]+)<\/priority>/)[1]) : undefined

    const images = (url.match(/<image:image>[\s\S]*?<\/image:image>/g) || []).map((image) => {
      const imageLoc = image.match(/<image:loc>([^<]+)<\/image:loc>/)?.[1]
      return imageLoc ? { loc: imageLoc } : null
    }).filter(Boolean)

    const videos = (url.match(/<video:video>[\s\S]*?<\/video:video>/g) || []).map((video) => {
      const videoObj: any = {}
      const title = video.match(/<video:title>([^<]+)<\/video:title>/)?.[1]
      const thumbnail_loc = video.match(/<video:thumbnail_loc>([^<]+)<\/video:thumbnail_loc>/)?.[1]
      const description = video.match(/<video:description>([^<]+)<\/video:description>/)?.[1]
      const content_loc = video.match(/<video:content_loc>([^<]+)<\/video:content_loc>/)?.[1]
      if (!title || !thumbnail_loc || !description || !content_loc) return null

      videoObj.title = title
      videoObj.thumbnail_loc = thumbnail_loc
      videoObj.description = description
      videoObj.content_loc = content_loc

      const player_loc = video.match(/<video:player_loc>([^<]+)<\/video:player_loc>/)?.[1]
      if (player_loc) videoObj.player_loc = player_loc

      const duration = video.match(/<video:duration>([^<]+)<\/video:duration>/) ? Number.parseInt(video.match(/<video:duration>([^<]+)<\/video:duration>/)[1], 10) : undefined
      if (duration) videoObj.duration = duration

      const expiration_date = video.match(/<video:expiration_date>([^<]+)<\/video:expiration_date>/)?.[1]
      if (expiration_date) videoObj.expiration_date = expiration_date

      const rating = video.match(/<video:rating>([^<]+)<\/video:rating>/) ? Number.parseFloat(video.match(/<video:rating>([^<]+)<\/video:rating>/)[1]) : undefined
      if (rating) videoObj.rating = rating

      const view_count = video.match(/<video:view_count>([^<]+)<\/video:view_count>/) ? Number.parseInt(video.match(/<video:view_count>([^<]+)<\/video:view_count>/)[1], 10) : undefined
      if (view_count) videoObj.view_count = view_count

      const publication_date = video.match(/<video:publication_date>([^<]+)<\/video:publication_date>/)?.[1]
      if (publication_date) videoObj.publication_date = publication_date

      const family_friendly = video.match(/<video:family_friendly>([^<]+)<\/video:family_friendly>/)?.[1]
      if (family_friendly) videoObj.family_friendly = family_friendly

      const restriction = video.match(/<video:restriction relationship="([^"]+)">([^<]+)<\/video:restriction>/)
      if (restriction) videoObj.restriction = { relationship: restriction[1], restriction: restriction[2] }

      const platform = video.match(/<video:platform relationship="([^"]+)">([^<]+)<\/video:platform>/)
      if (platform) videoObj.platform = { relationship: platform[1], platform: platform[2] }

      const price = (video.match(/<video:price [^>]+>([^<]+)<\/video:price>/g) || []).map((price) => {
        const priceValue = price.match(/<video:price [^>]+>([^<]+)<\/video:price>/)?.[1]
        const currency = price.match(/currency="([^"]+)"/)?.[1]
        const type = price.match(/type="([^"]+)"/)?.[1]
        return priceValue ? { price: priceValue, currency, type } : null
      }).filter(Boolean)
      if (price.length) videoObj.price = price

      const requires_subscription = video.match(/<video:requires_subscription>([^<]+)<\/video:requires_subscription>/)?.[1]
      if (requires_subscription) videoObj.requires_subscription = requires_subscription

      const uploader = video.match(/<video:uploader info="([^"]+)">([^<]+)<\/video:uploader>/)
      if (uploader) videoObj.uploader = { uploader: uploader[2], info: uploader[1] }

      const live = video.match(/<video:live>([^<]+)<\/video:live>/)?.[1]
      if (live) videoObj.live = live

      const tag = (video.match(/<video:tag>([^<]+)<\/video:tag>/g) || []).map(tag => tag.match(/<video:tag>([^<]+)<\/video:tag>/)?.[1]).filter(Boolean)
      if (tag.length) videoObj.tag = tag

      return videoObj
    }).filter(Boolean)

    const alternatives = (url.match(/<xhtml:link[\s\S]*?\/>/g) || []).map((link) => {
      const hreflang = link.match(/hreflang="([^"]+)"/)?.[1]
      const href = link.match(/href="([^"]+)"/)?.[1]
      return hreflang && href ? { hreflang, href } : null
    }).filter(Boolean)

    const news = url.match(/<news:news>[\s\S]*?<\/news:news>/)
      ? {
          title: url.match(/<news:title>([^<]+)<\/news:title>/)?.[1],
          publication_date: url.match(/<news:publication_date>([^<]+)<\/news:publication_date>/)?.[1],
          publication: {
            name: url.match(/<news:name>([^<]+)<\/news:name>/)?.[1],
            language: url.match(/<news:language>([^<]+)<\/news:language>/)?.[1],
          },
        }
      : undefined

    const urlObj: any = { loc, lastmod, changefreq, priority, images, videos, alternatives, news }
    return Object.fromEntries(Object.entries(urlObj).filter(([_, v]) => v != null && v.length !== 0))
  }).filter(Boolean) as any as SitemapUrlInput[]
}
