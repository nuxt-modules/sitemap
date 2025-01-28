import { parseURL } from 'ufo'
import type { ResolvedSitemapUrl, SitemapUrl, VideoEntry } from '../runtime/types'

const videoRegex = /<video[^>]*>([\s\S]*?)<\/video>/g
const videoSrcRegex = /<video[^>]*\ssrc="([^"]+)"/
const videoPosterRegex = /<video[^>]*\sposter="([^"]+)"/
const videoTitleRegex = /<video[^>]*\sdata-title="([^"]+)"/
const videoDescriptionRegex = /<video[^>]*\sdata-description="([^"]+)"/
const videoPlayerLocRegex = /<video[^>]*\sdata-player-loc="([^"]+)"/
const videoDurationRegex = /<video[^>]*\sdata-duration="([^"]+)"/
const videoExpirationDateRegex = /<video[^>]*\sdata-expiration-date="([^"]+)"/
const videoRatingRegex = /<video[^>]*\sdata-rating="([^"]+)"/
const videoViewCountRegex = /<video[^>]*\sdata-view-count="([^"]+)"/
const videoPublicationDateRegex = /<video[^>]*\sdata-publication-date="([^"]+)"/
const videoFamilyFriendlyRegex = /<video[^>]*\sdata-family-friendly="([^"]+)"/
const videoRequiresSubscriptionRegex = /<video[^>]*\sdata-requires-subscription="([^"]+)"/
const videoLiveRegex = /<video[^>]*\sdata-live="([^"]+)"/
const videoTagRegex = /<video[^>]*\sdata-tag="([^"]+)"/
const sourceRegex = /<source[^>]*\ssrc="([^"]+)"/g

export function extractSitemapMetaFromHtml(html: string, options?: { images?: boolean, videos?: boolean, lastmod?: boolean, alternatives?: boolean, resolveUrl?: (s: string) => string }) {
  options = options || { images: true, videos: true, lastmod: true, alternatives: true }
  const payload: Partial<SitemapUrl> = {}
  const resolveUrl = options?.resolveUrl || ((s: string) => s)
  const mainRegex = /<main[^>]*>([\s\S]*?)<\/main>/
  const mainMatch = mainRegex.exec(html)
  if (options?.images) {
    const images = new Set<string>()
    if (mainMatch?.[1] && mainMatch[1].includes('<img')) {
      // Extract image src attributes using regex on the HTML, but ignore elements with invalid values such as data:, blob:, or file:
      // eslint-disable-next-line regexp/no-useless-lazy,regexp/no-super-linear-backtracking
      const imgRegex = /<img\s+(?:[^>]*?\s)?src=["']((?!data:|blob:|file:)[^"']+?)["'][^>]*>/gi

      let match
      while ((match = imgRegex.exec(mainMatch[1])) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (match.index === imgRegex.lastIndex)
          imgRegex.lastIndex++
        const url = resolveUrl(match[1])
        images.add(url)
      }
    }
    if (images.size > 0)
      payload.images = [...images].map(i => ({ loc: i }))
  }

  if (options?.videos) {
    const videos = []
    if (mainMatch?.[1] && mainMatch[1].includes('<video')) {
      let videoMatch
      while ((videoMatch = videoRegex.exec(mainMatch[1])) !== null) {
        const videoContent = videoMatch[1]
        const videoTag = videoMatch[0]

        const content_loc = (videoSrcRegex.exec(videoTag) || [])[1] || ''
        const thumbnail_loc = (videoPosterRegex.exec(videoTag) || [])[1] || ''
        const title = (videoTitleRegex.exec(videoTag) || [])[1] || ''
        const description = (videoDescriptionRegex.exec(videoTag) || [])[1] || ''

        const videoObj: VideoEntry = {
          content_loc,
          thumbnail_loc,
          title,
          description,
        }

        const player_loc = (videoPlayerLocRegex.exec(videoTag) || [])[1]
        if (player_loc) videoObj.player_loc = player_loc

        const duration = (videoDurationRegex.exec(videoTag) || [])[1]
        if (duration) videoObj.duration = Number.parseInt(duration, 10)

        const expiration_date = (videoExpirationDateRegex.exec(videoTag) || [])[1]
        if (expiration_date) videoObj.expiration_date = expiration_date

        const rating = (videoRatingRegex.exec(videoTag) || [])[1]
        if (rating) videoObj.rating = Number.parseFloat(rating)

        const view_count = (videoViewCountRegex.exec(videoTag) || [])[1]
        if (view_count) videoObj.view_count = Number.parseInt(view_count, 10)

        const publication_date = (videoPublicationDateRegex.exec(videoTag) || [])[1]
        if (publication_date) videoObj.publication_date = publication_date

        const family_friendly = (videoFamilyFriendlyRegex.exec(videoTag) || [])[1]
        if (family_friendly) videoObj.family_friendly = family_friendly as VideoEntry['family_friendly']

        const requires_subscription = (videoRequiresSubscriptionRegex.exec(videoTag) || [])[1]
        if (requires_subscription) videoObj.requires_subscription = requires_subscription as VideoEntry['requires_subscription']

        const live = (videoLiveRegex.exec(videoTag) || [])[1]
        if (live) videoObj.live = live as VideoEntry['live']

        const tag = (videoTagRegex.exec(videoTag) || [])[1]
        if (tag) videoObj.tag = tag

        const sources = []
        let sourceMatch
        while ((sourceMatch = sourceRegex.exec(videoContent)) !== null) {
          sources.push(sourceMatch[1])
        }

        if (sources.length > 0) {
          videos.push(...sources.map((source) => {
            if (videoObj.thumbnail_loc) {
              videoObj.thumbnail_loc = resolveUrl(String(videoObj.thumbnail_loc))
            }
            return {
              ...videoObj,
              content_loc: resolveUrl(source),
            }
          }))
        }
        else {
          videos.push(videoObj)
        }
      }
    }

    // filter videos for being valid entries
    const validVideos = videos.filter((v) => {
      return v.content_loc && v.thumbnail_loc && v.title && v.description
    })
    if (validVideos.length > 0) {
      payload.videos = validVideos as VideoEntry[]
    }
  }

  if (options?.lastmod) {
    // let's extract the lastmod from the html using the following tags:
    const articleModifiedTime = html.match(/<meta[^>]+property="article:modified_time"[^>]+content="([^"]+)"/)?.[1]
      || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="article:modified_time"/)?.[1]
    if (articleModifiedTime)
      payload.lastmod = articleModifiedTime
  }

  if (options?.alternatives) {
    // do a loose regex match, get all alternative link lines
    // this is not tested
    const alternatives = (html.match(/<link[^>]+rel="alternate"[^>]+>/g) || [])
      .map((a) => {
        // extract the href, lang and type from the link
        const href = a.match(/href="([^"]+)"/)?.[1]
        const hreflang = a.match(/hreflang="([^"]+)"/)?.[1]
        return { hreflang, href: parseURL(href).pathname }
      })
      .filter(a => a.hreflang && a.href) as ResolvedSitemapUrl['alternatives']
    if (alternatives?.length && (alternatives.length > 1 || alternatives?.[0].hreflang !== 'x-default'))
      payload.alternatives = alternatives
  }
  return payload
}
