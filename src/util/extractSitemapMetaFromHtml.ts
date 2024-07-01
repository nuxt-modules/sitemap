import { withSiteUrl } from 'nuxt-site-config-kit/urls'
import { parseURL } from 'ufo'
import type { ResolvedSitemapUrl, SitemapUrl, VideoEntry } from '../runtime/types'

export function extractSitemapMetaFromHtml(html: string, options?: { images?: boolean, videos?: boolean, lastmod?: boolean, alternatives?: boolean }) {
  options = options || { images: true, videos: true, lastmod: true, alternatives: true }
  const payload: Partial<SitemapUrl> = {}
  if (options?.images) {
    const images = new Set<string>()
    const mainRegex = /<main[^>]*>([\s\S]*?)<\/main>/
    const mainMatch = mainRegex.exec(html)
    if (mainMatch?.[1] && mainMatch[1].includes('<img')) {
      // Extract image src attributes using regex on the HTML, but ignore elements with invalid values such as data:, blob:, or file:
      // eslint-disable-next-line regexp/no-useless-lazy
      const imgRegex = /<img\s+src=["']((?!data:|blob:|file:)[^"']+?)["'][^>]*>/gi

      let match
      while ((match = imgRegex.exec(mainMatch[1])) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (match.index === imgRegex.lastIndex)
          imgRegex.lastIndex++
        let url = match[1]
        // if the match is relative
        if (url.startsWith('/'))
          url = withSiteUrl(url)
        images.add(url)
      }
    }
    if (images.size > 0)
      payload.images = [...images].map(i => ({ loc: i }))
  }

  if (options?.videos) {
    const videos = []
    const mainRegex = /<main[^>]*>([\s\S]*?)<\/main>/
    const mainMatch = mainRegex.exec(html)

    if (mainMatch?.[1] && mainMatch[1].includes('<video')) {
      // Extract video src & child source attributes using regex on the HTML
      const videoRegex = /<video[^>]*>([\s\S]*?)<\/video>/g
      const videoAttrRegex = /<video[^>]*\ssrc="([^"]+)"(?:[^>]*\sposter="([^"]+)")?/
      const videoPosterRegex = /<video[^>]*\sposter="([^"]+)"/
      const videoTitleRegex = /<video[^>]*\sdata-title="([^"]+)"/
      const videoDescriptionRegex = /<video[^>]*\sdata-description="([^"]+)"/
      const sourceRegex = /<source[^>]*\ssrc="([^"]+)"/g

      let videoMatch
      while ((videoMatch = videoRegex.exec(mainMatch[1])) !== null) {
        const videoContent = videoMatch[1]
        const videoTag = videoMatch[0]

        // Extract src and poster attributes from the <video> tag
        const videoAttrMatch = videoAttrRegex.exec(videoTag)
        const videoSrc = videoAttrMatch ? videoAttrMatch[1] : ''
        const poster = (videoPosterRegex.exec(videoTag) || [])[1] || ''
        const title = (videoTitleRegex.exec(videoTag) || [])[1] || ''
        const description = (videoDescriptionRegex.exec(videoTag) || [])[1] || ''

        // Extract src attributes from child <source> elements
        const sources = []
        let sourceMatch
        while ((sourceMatch = sourceRegex.exec(videoContent)) !== null) {
          sources.push({
            src: sourceMatch[1],
            poster: poster,
            title: title,
            description: description,
          })
        }

        // Add video with src attribute
        if (videoSrc) {
          videos.push({
            src: videoSrc,
            poster: poster,
            title: title,
            description: description,
            sources: [],
          })
        }

        // Add sources with their respective posters
        if (sources.length > 0) {
          videos.push(...sources)
        }
      }
    }

    // Map videos to payload
    if (videos.length > 0) {
      payload.videos = videos.map(video =>
        ({
          content_loc: video.src,
          thumbnail_loc: video.poster,
          title: video.title,
          description: video.description,
        }) as VideoEntry,
      )
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
