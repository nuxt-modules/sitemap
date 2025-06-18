import { parseURL } from 'ufo'
import { parse, walkSync, ELEMENT_NODE } from 'ultrahtml'
import type { ElementNode } from 'ultrahtml'
import type { ResolvedSitemapUrl, SitemapUrl, VideoEntry } from '../runtime/types'

// Validation helpers
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false

  // Reject data URLs, blob URLs, and other non-http(s) protocols for sitemap content
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('file:')) {
    return false
  }

  try {
    const parsed = parseURL(trimmed)
    // Allow both absolute URLs (with protocol/host) and relative paths (with pathname)
    return !!(parsed.protocol && parsed.host) || !!parsed.pathname
  }
  catch {
    return false
  }
}

function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function sanitizeString(value: unknown): string {
  if (!isValidString(value)) return ''
  // eslint-disable-next-line no-control-regex
  return String(value).trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
}

function isValidDate(dateString: string): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  return !Number.isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 3000
}

export function parseHtmlExtractSitemapMeta(html: string, options?: { images?: boolean, videos?: boolean, lastmod?: boolean, alternatives?: boolean, resolveUrl?: (s: string) => string }) {
  options = options || { images: true, videos: true, lastmod: true, alternatives: true }
  const payload: Partial<SitemapUrl> = {}
  const resolveUrl = options?.resolveUrl || ((s: string) => s)

  let doc: any
  try {
    doc = parse(html)
  }
  catch (error) {
    console.warn('Failed to parse HTML:', error)
    return payload
  }

  // Collect all needed data in a single traversal
  let mainElement: ElementNode | null = null
  const images = new Set<string>()
  const videos: Array<{ videoObj: VideoEntry, element: ElementNode }> = []
  const videoSources = new Map<ElementNode, string[]>()
  let articleModifiedTime: string | undefined
  const alternatives: ResolvedSitemapUrl['alternatives'] = []

  // First pass: find main element and collect document-level elements
  walkSync(doc, (node) => {
    if (node.type === ELEMENT_NODE) {
      const element = node as ElementNode
      const attrs = element.attributes || {}

      // Find main element
      if (element.name === 'main' && !mainElement) {
        mainElement = element
      }

      // Collect lastmod meta tags (document-level)
      if (options?.lastmod && element.name === 'meta') {
        const property = sanitizeString(attrs.property)
        const content = sanitizeString(attrs.content)
        if (property === 'article:modified_time' && content && isValidDate(content)) {
          articleModifiedTime = content
        }
      }

      // Collect alternative links (document-level)
      if (options?.alternatives && element.name === 'link') {
        const rel = sanitizeString(attrs.rel)
        const href = sanitizeString(attrs.href)
        const hreflang = sanitizeString(attrs.hreflang)
        if (rel === 'alternate' && href && hreflang && isValidUrl(href)) {
          // Validate hreflang format (language codes)
          const hreflangPattern = /^[a-z]{2}(?:-[A-Z]{2})?$|^x-default$/
          if (hreflangPattern.test(hreflang)) {
            try {
              const parsed = parseURL(href)
              if (parsed.pathname) {
                alternatives.push({
                  hreflang,
                  href: parsed.pathname,
                })
              }
            }
            catch {
              // Skip invalid URLs
            }
          }
        }
      }
    }
  })

  // Second pass: traverse search scope for content elements
  const searchScope = mainElement || doc
  walkSync(searchScope, (node) => {
    if (node.type === ELEMENT_NODE) {
      const element = node as ElementNode
      const attrs = element.attributes || {}

      // Collect images
      if (options?.images && element.name === 'img') {
        const src = sanitizeString(attrs.src)
        if (src && isValidUrl(src)) {
          const resolvedUrl = resolveUrl(src)
          if (isValidUrl(resolvedUrl)) {
            images.add(resolvedUrl)
          }
        }
      }

      // Collect videos
      if (options?.videos && element.name === 'video') {
        const content_loc = sanitizeString(attrs.src)
        const thumbnail_loc = sanitizeString(attrs.poster)
        const title = sanitizeString(attrs['data-title'])
        const description = sanitizeString(attrs['data-description'])

        // Skip videos with invalid required fields
        if (!title || !description) {
          return
        }

        const videoObj: VideoEntry = {
          content_loc,
          thumbnail_loc,
          title,
          description,
        }

        // Handle optional video attributes with validation
        const player_loc = sanitizeString(attrs['data-player-loc'])
        if (player_loc && isValidUrl(player_loc)) {
          videoObj.player_loc = player_loc
        }

        const duration = sanitizeString(attrs['data-duration'])
        if (duration) {
          const parsedDuration = Number.parseInt(duration, 10)
          if (!Number.isNaN(parsedDuration) && parsedDuration > 0 && parsedDuration <= 28800) { // Max 8 hours
            videoObj.duration = parsedDuration
          }
        }

        const expiration_date = sanitizeString(attrs['data-expiration-date'])
        if (expiration_date && isValidDate(expiration_date)) {
          videoObj.expiration_date = expiration_date
        }

        const rating = sanitizeString(attrs['data-rating'])
        if (rating) {
          const parsedRating = Number.parseFloat(rating)
          if (!Number.isNaN(parsedRating) && parsedRating >= 0 && parsedRating <= 5) {
            videoObj.rating = parsedRating
          }
        }

        const view_count = sanitizeString(attrs['data-view-count'])
        if (view_count) {
          const parsedViewCount = Number.parseInt(view_count, 10)
          if (!Number.isNaN(parsedViewCount) && parsedViewCount >= 0) {
            videoObj.view_count = parsedViewCount
          }
        }

        const publication_date = sanitizeString(attrs['data-publication-date'])
        if (publication_date && isValidDate(publication_date)) {
          videoObj.publication_date = publication_date
        }

        const family_friendly = sanitizeString(attrs['data-family-friendly'])
        if (family_friendly && ['yes', 'no'].includes(family_friendly.toLowerCase())) {
          videoObj.family_friendly = family_friendly.toLowerCase() as VideoEntry['family_friendly']
        }

        const requires_subscription = sanitizeString(attrs['data-requires-subscription'])
        if (requires_subscription && ['yes', 'no'].includes(requires_subscription.toLowerCase())) {
          videoObj.requires_subscription = requires_subscription.toLowerCase() as VideoEntry['requires_subscription']
        }

        const live = sanitizeString(attrs['data-live'])
        if (live && ['yes', 'no'].includes(live.toLowerCase())) {
          videoObj.live = live.toLowerCase() as VideoEntry['live']
        }

        const tag = sanitizeString(attrs['data-tag'])
        if (tag && tag.length <= 256) { // Reasonable tag length limit
          videoObj.tag = tag
        }

        // Store video element for later source processing
        videos.push({ videoObj, element })
      }

      // Collect video sources
      if (options?.videos && element.name === 'source' && element.parent && element.parent.name === 'video') {
        const videoElement = element.parent as ElementNode
        const src = sanitizeString(attrs.src)
        if (src && isValidUrl(src)) {
          if (!videoSources.has(videoElement)) {
            videoSources.set(videoElement, [])
          }
          videoSources.get(videoElement)!.push(src)
        }
      }
    }
  })

  // Process collected data
  if (options?.images && images.size > 0) {
    payload.images = [...images].map(i => ({ loc: i }))
  }

  if (options?.videos) {
    const processedVideos: VideoEntry[] = []

    for (const { videoObj, element } of videos) {
      const sources = videoSources.get(element) || []

      if (sources.length > 0) {
        // Video has source elements - create one video entry per source
        for (const source of sources) {
          const resolvedVideoObj = { ...videoObj }
          if (resolvedVideoObj.thumbnail_loc) {
            resolvedVideoObj.thumbnail_loc = resolveUrl(String(resolvedVideoObj.thumbnail_loc))
          }
          processedVideos.push({
            ...resolvedVideoObj,
            content_loc: resolveUrl(source),
          })
        }
      }
      else {
        // Video has no source elements - use the video element directly
        processedVideos.push(videoObj)
      }
    }

    const validVideos = processedVideos.filter((v) => {
      return (
        isValidString(v.title)
        && isValidString(v.description)
        && isValidString(v.content_loc) && isValidUrl(v.content_loc)
        && isValidString(v.thumbnail_loc) && isValidUrl(v.thumbnail_loc)
        && v.title.length <= 2048 // Google's title limit
        && v.description.length <= 2048 // Google's description limit
      )
    })
    if (validVideos.length > 0) {
      payload.videos = validVideos
    }
  }

  if (options?.lastmod && articleModifiedTime) {
    payload.lastmod = articleModifiedTime
  }

  if (options?.alternatives && alternatives.length > 0 && (alternatives.length > 1 || alternatives[0].hreflang !== 'x-default')) {
    payload.alternatives = alternatives
  }

  return payload
}
