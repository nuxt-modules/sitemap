import { withSiteUrl } from 'nuxt-site-config-kit/urls'
import { parseURL } from 'ufo'
import type { ResolvedSitemapUrl, SitemapUrl } from '../runtime/types'

export function extractSitemapMetaFromHtml(html: string, options?: { images?: boolean, lastmod?: boolean, alternatives?: boolean }) {
  options = options || { images: true, lastmod: true, alternatives: true }
  const payload: Partial<SitemapUrl> = {}
  if (options?.images) {
    const images = new Set<string>()
    const mainRegex = /<main[^>]*>([\s\S]*?)<\/main>/
    const mainMatch = mainRegex.exec(html)
    if (mainMatch?.[1] && mainMatch[1].includes('<img')) {
      // Extract image src attributes using regex on the HTML, but ignore elements with invalid values such as data:, blob:, or file:
      const imgRegex = /<img\s+src=["']((?!data:|blob:|file:)[^"']+?)["'][^>]*>/gi

      let match
      // eslint-disable-next-line no-cond-assign
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
