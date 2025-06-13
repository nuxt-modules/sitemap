import { withQuery } from 'ufo'
import type { ModuleRuntimeConfig, NitroUrlResolvers, ResolvedSitemapUrl } from '../../../types'
import { xmlEscape } from '../../utils'

// Optimized XML escaping using string replace (faster than character loop)
export function escapeValueForXml(value: boolean | string | number): string {
  if (value === true || value === false)
    return value ? 'yes' : 'no'

  return xmlEscape(String(value))
}

// Cache constant strings to avoid repeated concatenation
const URLSET_OPENING_TAG = '<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'

// Use a string builder approach for memory efficiency
function buildUrlXml(url: ResolvedSitemapUrl): string {
  // Pre-allocate with a conservative estimate (most URLs won't have all features)
  const capacity = 50
  const parts: string[] = Array.from({ length: capacity })
  let partIndex = 0

  parts[partIndex++] = '    <url>'

  // Process elements in the standard sitemap order
  if (url.loc) {
    parts[partIndex++] = `        <loc>${escapeValueForXml(url.loc)}</loc>`
  }

  if (url.lastmod) {
    parts[partIndex++] = `        <lastmod>${url.lastmod}</lastmod>`
  }

  if (url.changefreq) {
    parts[partIndex++] = `        <changefreq>${url.changefreq}</changefreq>`
  }

  if (url.priority !== undefined) {
    const priorityValue = Number.parseFloat(String(url.priority))
    const formattedPriority = priorityValue % 1 === 0 ? String(priorityValue) : priorityValue.toFixed(1)
    parts[partIndex++] = `        <priority>${formattedPriority}</priority>`
  }

  // Process other properties
  const keys = Object.keys(url).filter(k => !k.startsWith('_') && !['loc', 'lastmod', 'changefreq', 'priority'].includes(k))

  for (const key of keys) {
    const value = url[key as keyof ResolvedSitemapUrl]

    if (value === undefined || value === null) continue

    switch (key) {
      case 'alternatives':
        if (Array.isArray(value) && value.length > 0) {
          for (const alt of value) {
            const attrs = Object.entries(alt)
              .map(([k, v]) => `${k}="${escapeValueForXml(v)}"`)
              .join(' ')
            parts[partIndex++] = `        <xhtml:link rel="alternate" ${attrs} />`
          }
        }
        break

      case 'images':
        if (Array.isArray(value) && value.length > 0) {
          for (const img of value) {
            parts[partIndex++] = '        <image:image>'
            parts[partIndex++] = `            <image:loc>${escapeValueForXml(img.loc)}</image:loc>`
            if (img.title) parts[partIndex++] = `            <image:title>${escapeValueForXml(img.title)}</image:title>`
            if (img.caption) parts[partIndex++] = `            <image:caption>${escapeValueForXml(img.caption)}</image:caption>`
            if (img.geo_location) parts[partIndex++] = `            <image:geo_location>${escapeValueForXml(img.geo_location)}</image:geo_location>`
            if (img.license) parts[partIndex++] = `            <image:license>${escapeValueForXml(img.license)}</image:license>`
            parts[partIndex++] = '        </image:image>'
          }
        }
        break

      case 'videos':
        if (Array.isArray(value) && value.length > 0) {
          for (const video of value) {
            parts[partIndex++] = '        <video:video>'
            parts[partIndex++] = `            <video:title>${escapeValueForXml(video.title)}</video:title>`

            if (video.thumbnail_loc) {
              parts[partIndex++] = `            <video:thumbnail_loc>${escapeValueForXml(video.thumbnail_loc)}</video:thumbnail_loc>`
            }
            parts[partIndex++] = `            <video:description>${escapeValueForXml(video.description)}</video:description>`

            if (video.content_loc) {
              parts[partIndex++] = `            <video:content_loc>${escapeValueForXml(video.content_loc)}</video:content_loc>`
            }
            if (video.player_loc) {
              const attrs = video.player_loc.allow_embed ? ' allow_embed="yes"' : ''
              const autoplay = video.player_loc.autoplay ? ' autoplay="yes"' : ''
              parts[partIndex++] = `            <video:player_loc${attrs}${autoplay}>${escapeValueForXml(video.player_loc)}</video:player_loc>`
            }
            if (video.duration !== undefined) {
              parts[partIndex++] = `            <video:duration>${video.duration}</video:duration>`
            }
            if (video.expiration_date) {
              parts[partIndex++] = `            <video:expiration_date>${video.expiration_date}</video:expiration_date>`
            }
            if (video.rating !== undefined) {
              parts[partIndex++] = `            <video:rating>${video.rating}</video:rating>`
            }
            if (video.view_count !== undefined) {
              parts[partIndex++] = `            <video:view_count>${video.view_count}</video:view_count>`
            }
            if (video.publication_date) {
              parts[partIndex++] = `            <video:publication_date>${video.publication_date}</video:publication_date>`
            }
            if (video.family_friendly !== undefined) {
              parts[partIndex++] = `            <video:family_friendly>${video.family_friendly === 'yes' || video.family_friendly === true ? 'yes' : 'no'}</video:family_friendly>`
            }
            if (video.restriction) {
              const relationship = video.restriction.relationship || 'allow'
              parts[partIndex++] = `            <video:restriction relationship="${relationship}">${escapeValueForXml(video.restriction.restriction)}</video:restriction>`
            }
            if (video.platform) {
              const relationship = video.platform.relationship || 'allow'
              parts[partIndex++] = `            <video:platform relationship="${relationship}">${escapeValueForXml(video.platform.platform)}</video:platform>`
            }
            if (video.requires_subscription !== undefined) {
              parts[partIndex++] = `            <video:requires_subscription>${video.requires_subscription === 'yes' || video.requires_subscription === true ? 'yes' : 'no'}</video:requires_subscription>`
            }
            if (video.price) {
              const prices = Array.isArray(video.price) ? video.price : [video.price]
              for (const price of prices) {
                const attrs: string[] = []
                if (price.currency) attrs.push(`currency="${price.currency}"`)
                if (price.type) attrs.push(`type="${price.type}"`)
                const attrsStr = attrs.length > 0 ? ' ' + attrs.join(' ') : ''
                parts[partIndex++] = `            <video:price${attrsStr}>${escapeValueForXml(price.price)}</video:price>`
              }
            }
            if (video.uploader) {
              const info = video.uploader.info ? ` info="${escapeValueForXml(video.uploader.info)}"` : ''
              parts[partIndex++] = `            <video:uploader${info}>${escapeValueForXml(video.uploader.uploader)}</video:uploader>`
            }
            if (video.live !== undefined) {
              parts[partIndex++] = `            <video:live>${video.live === 'yes' || video.live === true ? 'yes' : 'no'}</video:live>`
            }
            if (video.tag) {
              const tags = Array.isArray(video.tag) ? video.tag : [video.tag]
              for (const tag of tags) {
                parts[partIndex++] = `            <video:tag>${escapeValueForXml(tag)}</video:tag>`
              }
            }
            if (video.category) {
              parts[partIndex++] = `            <video:category>${escapeValueForXml(video.category)}</video:category>`
            }
            if (video.gallery_loc) {
              const title = video.gallery_loc.title ? ` title="${escapeValueForXml(video.gallery_loc.title)}"` : ''
              parts[partIndex++] = `            <video:gallery_loc${title}>${escapeValueForXml(video.gallery_loc)}</video:gallery_loc>`
            }
            parts[partIndex++] = '        </video:video>'
          }
        }
        break

      case 'news':
        if (value) {
          parts[partIndex++] = '        <news:news>'
          parts[partIndex++] = '            <news:publication>'
          parts[partIndex++] = `                <news:name>${escapeValueForXml(value.publication.name)}</news:name>`
          parts[partIndex++] = `                <news:language>${escapeValueForXml(value.publication.language)}</news:language>`
          parts[partIndex++] = '            </news:publication>'

          if (value.title) {
            parts[partIndex++] = `            <news:title>${escapeValueForXml(value.title)}</news:title>`
          }
          if (value.publication_date) {
            parts[partIndex++] = `            <news:publication_date>${value.publication_date}</news:publication_date>`
          }
          if (value.access) {
            parts[partIndex++] = `            <news:access>${value.access}</news:access>`
          }
          if (value.genres) {
            parts[partIndex++] = `            <news:genres>${escapeValueForXml(value.genres)}</news:genres>`
          }
          if (value.keywords) {
            parts[partIndex++] = `            <news:keywords>${escapeValueForXml(value.keywords)}</news:keywords>`
          }
          if (value.stock_tickers) {
            parts[partIndex++] = `            <news:stock_tickers>${escapeValueForXml(value.stock_tickers)}</news:stock_tickers>`
          }
          parts[partIndex++] = '        </news:news>'
        }
        break
    }
  }

  parts[partIndex++] = '    </url>'

  // Return only the used portion of the array
  return parts.slice(0, partIndex).join('\n')
}

export function urlsToXml(
  urls: ResolvedSitemapUrl[],
  resolvers: NitroUrlResolvers,
  { version, xsl, credits, minify }: Pick<ModuleRuntimeConfig, 'version' | 'xsl' | 'credits' | 'minify'>,
  errorInfo?: { messages: string[], urls: string[] },
): string {
  // Pre-calculate size for better memory allocation
  const estimatedSize = urls.length + 5
  const xmlParts: string[] = Array.from({ length: estimatedSize })
  let partIndex = 0

  let xslHref = xsl ? resolvers.relativeBaseUrlResolver(xsl) : false

  // Add error information to XSL URL if available
  if (xslHref && errorInfo && errorInfo.messages.length > 0) {
    xslHref = withQuery(xslHref, {
      errors: 'true',
      error_messages: errorInfo.messages,
      error_urls: errorInfo.urls,
    })
  }

  // XML declaration and stylesheet
  if (xslHref) {
    xmlParts[partIndex++] = `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="${escapeValueForXml(xslHref)}"?>`
  }
  else {
    xmlParts[partIndex++] = '<?xml version="1.0" encoding="UTF-8"?>'
  }

  // Opening tag with namespaces
  xmlParts[partIndex++] = URLSET_OPENING_TAG

  // Process URLs
  for (const url of urls) {
    xmlParts[partIndex++] = buildUrlXml(url)
  }

  // Closing tag
  xmlParts[partIndex++] = '</urlset>'

  // Credits
  if (credits) {
    xmlParts[partIndex++] = `<!-- XML Sitemap generated by @nuxtjs/sitemap v${version} at ${new Date().toISOString()} -->`
  }

  // Join only the used parts
  const xmlContent = xmlParts.slice(0, partIndex)

  if (minify) {
    // Single join for minified output
    return xmlContent.join('').replace(/(?<!<[^>]*)\s(?![^<]*>)/g, '')
  }

  // Join with newlines for readable output
  return xmlContent.join('\n')
}
