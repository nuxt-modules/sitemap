import type {
  SitemapUrlInput,
  VideoEntry,
  ImageEntry,
  AlternativeEntry,
  GoogleNewsEntry,
  SitemapStrict,
  VideoEntryPrice
} from '../runtime/types'

interface ParsedUrl {
  loc?: string
  lastmod?: string
  changefreq?: string
  priority?: string | number
  image?: ParsedImage | ParsedImage[]
  video?: ParsedVideo | ParsedVideo[]
  link?: ParsedLink | ParsedLink[]
  news?: ParsedNews
}

interface ParsedImage {
  loc?: string
}

interface ParsedVideo {
  title?: string
  thumbnail_loc?: string
  description?: string
  content_loc?: string
  player_loc?: string
  duration?: string | number
  expiration_date?: string
  rating?: string | number
  view_count?: string | number
  publication_date?: string
  family_friendly?: string
  requires_subscription?: string
  live?: string
  restriction?: {
    'relationship'?: string
    '#text'?: string
  }
  platform?: {
    'relationship'?: string
    '#text'?: string
  }
  price?: ParsedPrice | ParsedPrice[]
  uploader?: {
    'info'?: string
    '#text'?: string
  }
  tag?: string | string[]
}

interface ParsedPrice {
  '#text'?: string
  'currency'?: string
  'type'?: string
}

interface ParsedLink {
  rel?: string
  hreflang?: string
  href?: string
}

interface ParsedNews {
  title?: string
  publication_date?: string
  publication?: {
    name?: string
    language?: string
  }
}

interface ParsedUrlset {
  url?: ParsedUrl | ParsedUrl[]
}

interface ParsedRoot {
  urlset?: ParsedUrlset
}

export interface SitemapWarning {
  type: 'validation'
  message: string
  context?: {
    url?: string
    field?: string
    value?: unknown
  }
}

export interface SitemapParseResult {
  urls: SitemapUrlInput[]
  warnings: SitemapWarning[]
}

function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim()) {
    const num = Number.parseFloat(value.trim())
    return Number.isNaN(num) ? undefined : num
  }
  return undefined
}

function parseInteger(value: unknown): number | undefined {
  if (typeof value === 'number') return Math.floor(value)
  if (typeof value === 'string' && value.trim()) {
    const num = Number.parseInt(value.trim(), 10)
    return Number.isNaN(num) ? undefined : num
  }
  return undefined
}

function extractUrlFromParsedElement(
  urlElement: ParsedUrl,
  warnings: SitemapWarning[],
): SitemapUrlInput | null {
  if (!isValidString(urlElement.loc)) {
    warnings.push({
      type: 'validation',
      message: 'URL entry missing required loc element',
      context: { url: String(urlElement.loc || 'undefined') },
    })
    return null
  }

  const urlObj: Partial<SitemapUrlInput> = { loc: urlElement.loc }

  // Handle optional fields with validation
  if (isValidString(urlElement.lastmod)) {
    urlObj.lastmod = urlElement.lastmod
  }

  if (isValidString(urlElement.changefreq)) {
    const validFreqs = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
    if (validFreqs.includes(urlElement.changefreq)) {
      urlObj.changefreq = urlElement.changefreq as SitemapStrict['changefreq']
    }
    else {
      warnings.push({
        type: 'validation',
        message: 'Invalid changefreq value',
        context: { url: urlElement.loc, field: 'changefreq', value: urlElement.changefreq },
      })
    }
  }

  const priority = parseNumber(urlElement.priority)
  if (priority !== undefined && !Number.isNaN(priority)) {
    if (priority < 0 || priority > 1) {
      warnings.push({
        type: 'validation',
        message: 'Priority value should be between 0.0 and 1.0, clamping to valid range',
        context: { url: urlElement.loc, field: 'priority', value: priority },
      })
    }
    // Clamp priority to valid sitemap range
    urlObj.priority = Math.max(0, Math.min(1, priority)) as SitemapStrict['priority']
  }
  else if (urlElement.priority !== undefined) {
    warnings.push({
      type: 'validation',
      message: 'Invalid priority value',
      context: { url: urlElement.loc, field: 'priority', value: urlElement.priority },
    })
  }

  // Handle images
  if (urlElement.image) {
    const images = Array.isArray(urlElement.image) ? urlElement.image : [urlElement.image]
    const validImages: ImageEntry[] = images
      .map((img: ParsedImage): ImageEntry | null => {
        if (isValidString(img.loc)) {
          return { loc: img.loc }
        }
        else {
          warnings.push({
            type: 'validation',
            message: 'Image missing required loc element',
            context: { url: urlElement.loc, field: 'image.loc' },
          })
          return null
        }
      })
      .filter((img): img is ImageEntry => img !== null)

    if (validImages.length > 0) {
      urlObj.images = validImages
    }
  }

  // Handle videos
  if (urlElement.video) {
    const videos = Array.isArray(urlElement.video) ? urlElement.video : [urlElement.video]
    const validVideos: VideoEntry[] = videos
      .map((video: ParsedVideo): VideoEntry | null => {
        // Check required fields
        const missingFields: string[] = []
        if (!isValidString(video.title)) missingFields.push('title')
        if (!isValidString(video.thumbnail_loc)) missingFields.push('thumbnail_loc')
        if (!isValidString(video.description)) missingFields.push('description')
        if (!isValidString(video.content_loc)) missingFields.push('content_loc')

        if (missingFields.length > 0) {
          warnings.push({
            type: 'validation',
            message: `Video missing required fields: ${missingFields.join(', ')}`,
            context: { url: urlElement.loc, field: 'video' },
          })
          return null
        }

        const videoObj: VideoEntry = {
          title: video.title!,
          thumbnail_loc: video.thumbnail_loc!,
          description: video.description!,
          content_loc: video.content_loc!,
        }

        // Handle optional video fields
        if (isValidString(video.player_loc)) {
          videoObj.player_loc = video.player_loc
        }

        const duration = parseInteger(video.duration)
        if (duration !== undefined) {
          videoObj.duration = duration
        }
        else if (video.duration !== undefined) {
          warnings.push({
            type: 'validation',
            message: 'Invalid video duration value',
            context: { url: urlElement.loc, field: 'video.duration', value: video.duration },
          })
        }

        if (isValidString(video.expiration_date)) {
          videoObj.expiration_date = video.expiration_date
        }

        const rating = parseNumber(video.rating)
        if (rating !== undefined) {
          if (rating < 0 || rating > 5) {
            warnings.push({
              type: 'validation',
              message: 'Video rating should be between 0.0 and 5.0',
              context: { url: urlElement.loc, field: 'video.rating', value: rating },
            })
          }
          videoObj.rating = rating
        }
        else if (video.rating !== undefined) {
          warnings.push({
            type: 'validation',
            message: 'Invalid video rating value',
            context: { url: urlElement.loc, field: 'video.rating', value: video.rating },
          })
        }

        const viewCount = parseInteger(video.view_count)
        if (viewCount !== undefined) {
          videoObj.view_count = viewCount
        }
        else if (video.view_count !== undefined) {
          warnings.push({
            type: 'validation',
            message: 'Invalid video view_count value',
            context: { url: urlElement.loc, field: 'video.view_count', value: video.view_count },
          })
        }

        if (isValidString(video.publication_date)) {
          videoObj.publication_date = video.publication_date
        }

        if (isValidString(video.family_friendly)) {
          const validValues = ['yes', 'no']
          if (validValues.includes(video.family_friendly)) {
            videoObj.family_friendly = video.family_friendly as VideoEntry['family_friendly']
          }
          else {
            warnings.push({
              type: 'validation',
              message: 'Invalid video family_friendly value, should be "yes" or "no"',
              context: { url: urlElement.loc, field: 'video.family_friendly', value: video.family_friendly },
            })
          }
        }

        if (isValidString(video.requires_subscription)) {
          const validValues = ['yes', 'no']
          if (validValues.includes(video.requires_subscription)) {
            videoObj.requires_subscription = video.requires_subscription as VideoEntry['requires_subscription']
          }
          else {
            warnings.push({
              type: 'validation',
              message: 'Invalid video requires_subscription value, should be "yes" or "no"',
              context: { url: urlElement.loc, field: 'video.requires_subscription', value: video.requires_subscription },
            })
          }
        }

        if (isValidString(video.live)) {
          const validValues = ['yes', 'no']
          if (validValues.includes(video.live)) {
            videoObj.live = video.live as VideoEntry['live']
          }
          else {
            warnings.push({
              type: 'validation',
              message: 'Invalid video live value, should be "yes" or "no"',
              context: { url: urlElement.loc, field: 'video.live', value: video.live },
            })
          }
        }

        // Handle restriction (element-based, not attribute-based)
        if (video.restriction && typeof video.restriction === 'object') {
          const restriction = video.restriction
          if (isValidString(restriction.relationship) && isValidString(restriction['#text'])) {
            const validRelationships = ['allow', 'deny']
            if (validRelationships.includes(restriction.relationship)) {
              videoObj.restriction = {
                relationship: restriction.relationship as 'allow' | 'deny',
                restriction: restriction['#text'],
              }
            }
            else {
              warnings.push({
                type: 'validation',
                message: 'Invalid video restriction relationship, should be "allow" or "deny"',
                context: { url: urlElement.loc, field: 'video.restriction.relationship', value: restriction.relationship },
              })
            }
          }
        }

        // Handle platform (element-based, not attribute-based)
        if (video.platform && typeof video.platform === 'object') {
          const platform = video.platform
          if (isValidString(platform.relationship) && isValidString(platform['#text'])) {
            const validRelationships = ['allow', 'deny']
            if (validRelationships.includes(platform.relationship)) {
              videoObj.platform = {
                relationship: platform.relationship as 'allow' | 'deny',
                platform: platform['#text'],
              }
            }
            else {
              warnings.push({
                type: 'validation',
                message: 'Invalid video platform relationship, should be "allow" or "deny"',
                context: { url: urlElement.loc, field: 'video.platform.relationship', value: platform.relationship },
              })
            }
          }
        }

        // Handle price - keep as strings to maintain precision
        if (video.price) {
          const prices = Array.isArray(video.price) ? video.price : [video.price]
          const validPrices = prices
            .map((price: ParsedPrice) => {
              const priceValue = price['#text']
              if (priceValue == null || (typeof priceValue !== 'string' && typeof priceValue !== 'number')) {
                warnings.push({
                  type: 'validation',
                  message: 'Video price missing value',
                  context: { url: urlElement.loc, field: 'video.price' },
                })
                return null
              }

              const validTypes = ['rent', 'purchase', 'package', 'subscription']
              if (price.type && !validTypes.includes(price.type)) {
                warnings.push({
                  type: 'validation',
                  message: `Invalid video price type "${price.type}", should be one of: ${validTypes.join(', ')}`,
                  context: { url: urlElement.loc, field: 'video.price.type', value: price.type },
                })
              }

              return {
                price: String(priceValue),
                currency: price.currency,
                type: price.type as VideoEntryPrice['type'],
              }
            })
            .filter((p): p is NonNullable<typeof p> => p !== null)

          if (validPrices.length > 0) {
            videoObj.price = validPrices
          }
        }

        // Handle uploader (element-based)
        if (video.uploader && typeof video.uploader === 'object') {
          const uploader = video.uploader
          if (isValidString(uploader.info) && isValidString(uploader['#text'])) {
            videoObj.uploader = {
              uploader: uploader['#text'],
              info: uploader.info,
            }
          }
          else {
            warnings.push({
              type: 'validation',
              message: 'Video uploader missing required info or name',
              context: { url: urlElement.loc, field: 'video.uploader' },
            })
          }
        }

        // Handle tags
        if (video.tag) {
          const tags = Array.isArray(video.tag) ? video.tag : [video.tag]
          const validTags = tags.filter(isValidString)

          if (validTags.length > 0) {
            videoObj.tag = validTags
          }
        }

        return videoObj
      })
      .filter((video): video is VideoEntry => video !== null)

    if (validVideos.length > 0) {
      urlObj.videos = validVideos
    }
  }

  // Handle alternatives (element-based xhtml:link)
  if (urlElement.link) {
    const links = Array.isArray(urlElement.link) ? urlElement.link : [urlElement.link]
    const alternatives: AlternativeEntry[] = links
      .map((link: ParsedLink): AlternativeEntry | null => {
        if (link.rel === 'alternate' && isValidString(link.hreflang) && isValidString(link.href)) {
          return {
            hreflang: link.hreflang,
            href: link.href,
          }
        }
        else {
          warnings.push({
            type: 'validation',
            message: 'Alternative link missing required rel="alternate", hreflang, or href',
            context: { url: urlElement.loc, field: 'link' },
          })
          return null
        }
      })
      .filter((alt): alt is AlternativeEntry => alt !== null)

    if (alternatives.length > 0) {
      urlObj.alternatives = alternatives
    }
  }

  // Handle news
  if (urlElement.news && typeof urlElement.news === 'object') {
    const news = urlElement.news as ParsedNews
    if (
      isValidString(news.title)
      && isValidString(news.publication_date)
      && news.publication
      && isValidString(news.publication.name)
      && isValidString(news.publication.language)
    ) {
      urlObj.news = {
        title: news.title!,
        publication_date: news.publication_date!,
        publication: {
          name: news.publication.name!,
          language: news.publication.language!,
        },
      } as GoogleNewsEntry
    }
    else {
      warnings.push({
        type: 'validation',
        message: 'News entry missing required fields (title, publication_date, publication.name, publication.language)',
        context: { url: urlElement.loc, field: 'news' },
      })
    }
  }

  // Filter out undefined values and empty arrays
  const filteredUrlObj: typeof urlObj = Object.fromEntries(
    Object.entries(urlObj).filter(([_, value]) =>
      value != null && (!Array.isArray(value) || value.length > 0),
    ),
  )

  return filteredUrlObj as SitemapUrlInput
}

export async function parseSitemapXml(xml: string): Promise<SitemapParseResult> {
  const warnings: SitemapWarning[] = []

  if (!xml) {
    throw new Error('Empty XML input provided')
  }
  const { XMLParser } = await import('fast-xml-parser')
  const parser = new XMLParser({
    isArray: (tagName: string): boolean =>
      ['url', 'image', 'video', 'link', 'tag', 'price'].includes(tagName),
    removeNSPrefix: true,
    parseAttributeValue: false,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    trimValues: true,
  })

  try {
    const parsed = parser.parse(xml) as ParsedRoot

    if (!parsed?.urlset) {
      throw new Error('XML does not contain a valid urlset element')
    }

    if (!parsed.urlset.url) {
      throw new Error('Sitemap contains no URL entries')
    }

    const urls = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url]

    const validUrls = urls
      .map((url: ParsedUrl) => extractUrlFromParsedElement(url, warnings))
      .filter((url): url is SitemapUrlInput => url !== null)

    if (validUrls.length === 0 && urls.length > 0) {
      warnings.push({
        type: 'validation',
        message: 'No valid URLs found in sitemap after validation',
      })
    }

    return { urls: validUrls, warnings }
  }
  catch (error) {
    if (error instanceof Error && (
      error.message === 'Empty XML input provided'
      || error.message === 'XML does not contain a valid urlset element'
      || error.message === 'Sitemap contains no URL entries'
    )) {
      throw error
    }
    throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : String(error)}`)
  }
}
