// Fast state machine based XML parser for sitemap extraction
export function extractSitemapXMLFast(xml: string): any[] {
  const urls: any[] = []
  let i = 0
  const len = xml.length

  while (i < len) {
    // Find next <url> tag
    const urlStart = xml.indexOf('<url>', i)
    if (urlStart === -1) break

    const urlEnd = xml.indexOf('</url>', urlStart)
    if (urlEnd === -1) break

    // Extract URL content
    const urlContent = xml.slice(urlStart + 5, urlEnd)
    const url: any = {}

    // Extract loc (required)
    const locStart = urlContent.indexOf('<loc>')
    if (locStart !== -1) {
      const locEnd = urlContent.indexOf('</loc>', locStart)
      if (locEnd !== -1) {
        url.loc = urlContent.slice(locStart + 5, locEnd)
      }
    }

    // Only continue if we have a valid loc
    if (!url.loc) {
      i = urlEnd + 6
      continue
    }

    // Extract optional fields
    const lastmodStart = urlContent.indexOf('<lastmod>')
    if (lastmodStart !== -1) {
      const lastmodEnd = urlContent.indexOf('</lastmod>', lastmodStart)
      if (lastmodEnd !== -1) {
        url.lastmod = urlContent.slice(lastmodStart + 9, lastmodEnd)
      }
    }

    const changefreqStart = urlContent.indexOf('<changefreq>')
    if (changefreqStart !== -1) {
      const changefreqEnd = urlContent.indexOf('</changefreq>', changefreqStart)
      if (changefreqEnd !== -1) {
        url.changefreq = urlContent.slice(changefreqStart + 12, changefreqEnd)
      }
    }

    const priorityStart = urlContent.indexOf('<priority>')
    if (priorityStart !== -1) {
      const priorityEnd = urlContent.indexOf('</priority>', priorityStart)
      if (priorityEnd !== -1) {
        const priorityStr = urlContent.slice(priorityStart + 10, priorityEnd)
        const priority = Number.parseFloat(priorityStr)
        if (!Number.isNaN(priority)) {
          url.priority = priority
        }
      }
    }

    // Extract images (simplified)
    const images: any[] = []
    let imgPos = 0
    while (true) {
      const imgStart = urlContent.indexOf('<image:image>', imgPos)
      if (imgStart === -1) break

      const imgEnd = urlContent.indexOf('</image:image>', imgStart)
      if (imgEnd === -1) break

      const imgContent = urlContent.slice(imgStart + 13, imgEnd)
      const imgLocStart = imgContent.indexOf('<image:loc>')
      if (imgLocStart !== -1) {
        const imgLocEnd = imgContent.indexOf('</image:loc>', imgLocStart)
        if (imgLocEnd !== -1) {
          images.push({ loc: imgContent.slice(imgLocStart + 11, imgLocEnd) })
        }
      }

      imgPos = imgEnd + 14
    }

    if (images.length > 0) {
      url.images = images
    }

    urls.push(url)
    i = urlEnd + 6
  }

  return urls
}
