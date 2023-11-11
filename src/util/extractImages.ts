import { withSiteUrl } from 'nuxt-site-config-kit'

export function extractImages(html: string) {
  const images = new Set<string>()
  const mainRegex = /<main[^>]*>([\s\S]*?)<\/main>/
  const mainMatch = mainRegex.exec(html)
  if (!mainMatch || !mainMatch[1])
    return images
  if (mainMatch[1].includes('<img')) {
    // extract image src using regex on the html
    const imgRegex = /<img[^>]+src="([^">]+)"/g
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
  return images
}
