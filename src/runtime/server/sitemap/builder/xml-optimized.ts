import type { ModuleRuntimeConfig, NitroUrlResolvers, ResolvedSitemapUrl } from '../../../types'

// Optimized XML escaping using string replace (faster than character loop)
export function escapeValueForXml(value: boolean | string | number): string {
  if (value === true || value === false)
    return value ? 'yes' : 'no'

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildUrlXml(url: ResolvedSitemapUrl): string {
  const parts: string[] = ['    <url>']

  // Process elements in the standard sitemap order
  if (url.loc) {
    parts.push(`        <loc>${escapeValueForXml(url.loc)}</loc>`)
  }

  if (url.lastmod) {
    parts.push(`        <lastmod>${url.lastmod}</lastmod>`)
  }

  if (url.changefreq) {
    parts.push(`        <changefreq>${url.changefreq}</changefreq>`)
  }

  if (url.priority !== undefined) {
    const priorityValue = Number.parseFloat(String(url.priority))
    // Format to decimal only if not a whole number
    const formattedPriority = priorityValue % 1 === 0 ? String(priorityValue) : priorityValue.toFixed(1)
    parts.push(`        <priority>${formattedPriority}</priority>`)
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
            parts.push(`        <xhtml:link rel="alternate" ${attrs} />`)
          }
        }
        break

      case 'images':
        if (Array.isArray(value) && value.length > 0) {
          for (const img of value) {
            parts.push('        <image:image>')
            parts.push(`            <image:loc>${escapeValueForXml(img.loc)}</image:loc>`)
            if (img.title) parts.push(`            <image:title>${escapeValueForXml(img.title)}</image:title>`)
            if (img.caption) parts.push(`            <image:caption>${escapeValueForXml(img.caption)}</image:caption>`)
            if (img.geo_location) parts.push(`            <image:geo_location>${escapeValueForXml(img.geo_location)}</image:geo_location>`)
            if (img.license) parts.push(`            <image:license>${escapeValueForXml(img.license)}</image:license>`)
            parts.push('        </image:image>')
          }
        }
        break

      case 'videos':
        if (Array.isArray(value) && value.length > 0) {
          for (const video of value) {
            parts.push('        <video:video>')
            // Follow the expected order from tests
            parts.push(`            <video:title>${escapeValueForXml(video.title)}</video:title>`)
            if (video.thumbnail_loc) {
              parts.push(`            <video:thumbnail_loc>${escapeValueForXml(video.thumbnail_loc)}</video:thumbnail_loc>`)
            }
            parts.push(`            <video:description>${escapeValueForXml(video.description)}</video:description>`)

            if (video.content_loc) {
              parts.push(`            <video:content_loc>${escapeValueForXml(video.content_loc)}</video:content_loc>`)
            }
            if (video.player_loc) {
              const attrs = video.player_loc.allow_embed ? ' allow_embed="yes"' : ''
              const autoplay = video.player_loc.autoplay ? ' autoplay="yes"' : ''
              parts.push(`            <video:player_loc${attrs}${autoplay}>${escapeValueForXml(video.player_loc)}</video:player_loc>`)
            }
            if (video.duration !== undefined) {
              parts.push(`            <video:duration>${video.duration}</video:duration>`)
            }
            if (video.expiration_date) {
              parts.push(`            <video:expiration_date>${video.expiration_date}</video:expiration_date>`)
            }
            if (video.rating !== undefined) {
              parts.push(`            <video:rating>${video.rating}</video:rating>`)
            }
            if (video.view_count !== undefined) {
              parts.push(`            <video:view_count>${video.view_count}</video:view_count>`)
            }
            if (video.publication_date) {
              parts.push(`            <video:publication_date>${video.publication_date}</video:publication_date>`)
            }
            if (video.family_friendly !== undefined) {
              parts.push(`            <video:family_friendly>${video.family_friendly === 'yes' || video.family_friendly === true ? 'yes' : 'no'}</video:family_friendly>`)
            }
            if (video.restriction) {
              const relationship = video.restriction.relationship || 'allow'
              parts.push(`            <video:restriction relationship="${relationship}">${escapeValueForXml(video.restriction.restriction)}</video:restriction>`)
            }
            if (video.platform) {
              const relationship = video.platform.relationship || 'allow'
              parts.push(`            <video:platform relationship="${relationship}">${escapeValueForXml(video.platform.platform)}</video:platform>`)
            }
            if (video.requires_subscription !== undefined) {
              parts.push(`            <video:requires_subscription>${video.requires_subscription === 'yes' || video.requires_subscription === true ? 'yes' : 'no'}</video:requires_subscription>`)
            }
            if (video.price) {
              // Price can be an array or a single object
              const prices = Array.isArray(video.price) ? video.price : [video.price]
              for (const price of prices) {
                const attrs: string[] = []
                if (price.currency) attrs.push(`currency="${price.currency}"`)
                if (price.type) attrs.push(`type="${price.type}"`)
                const attrsStr = attrs.length > 0 ? ' ' + attrs.join(' ') : ''
                parts.push(`            <video:price${attrsStr}>${escapeValueForXml(price.price)}</video:price>`)
              }
            }
            if (video.uploader) {
              const info = video.uploader.info ? ` info="${escapeValueForXml(video.uploader.info)}"` : ''
              parts.push(`            <video:uploader${info}>${escapeValueForXml(video.uploader.uploader)}</video:uploader>`)
            }
            if (video.live !== undefined) {
              parts.push(`            <video:live>${video.live === 'yes' || video.live === true ? 'yes' : 'no'}</video:live>`)
            }
            if (video.tag) {
              const tags = Array.isArray(video.tag) ? video.tag : [video.tag]
              for (const tag of tags) {
                parts.push(`            <video:tag>${escapeValueForXml(tag)}</video:tag>`)
              }
            }
            if (video.category) {
              parts.push(`            <video:category>${escapeValueForXml(video.category)}</video:category>`)
            }
            if (video.gallery_loc) {
              const title = video.gallery_loc.title ? ` title="${escapeValueForXml(video.gallery_loc.title)}"` : ''
              parts.push(`            <video:gallery_loc${title}>${escapeValueForXml(video.gallery_loc)}</video:gallery_loc>`)
            }
            parts.push('        </video:video>')
          }
        }
        break

      case 'news':
        if (value) {
          parts.push('        <news:news>')
          parts.push('            <news:publication>')
          parts.push(`                <news:name>${escapeValueForXml(value.publication.name)}</news:name>`)
          parts.push(`                <news:language>${escapeValueForXml(value.publication.language)}</news:language>`)
          parts.push('            </news:publication>')

          // Follow the expected order: title, publication_date, then other elements
          if (value.title) {
            parts.push(`            <news:title>${escapeValueForXml(value.title)}</news:title>`)
          }
          if (value.publication_date) {
            parts.push(`            <news:publication_date>${value.publication_date}</news:publication_date>`)
          }
          if (value.access) {
            parts.push(`            <news:access>${value.access}</news:access>`)
          }
          if (value.genres) {
            parts.push(`            <news:genres>${escapeValueForXml(value.genres)}</news:genres>`)
          }
          if (value.keywords) {
            parts.push(`            <news:keywords>${escapeValueForXml(value.keywords)}</news:keywords>`)
          }
          if (value.stock_tickers) {
            parts.push(`            <news:stock_tickers>${escapeValueForXml(value.stock_tickers)}</news:stock_tickers>`)
          }
          parts.push('        </news:news>')
        }
        break
    }
  }

  parts.push('    </url>')
  return parts.join('\n')
}

export function urlsToXml(
  urls: ResolvedSitemapUrl[],
  resolvers: NitroUrlResolvers,
  { version, xsl, credits, minify }: Pick<ModuleRuntimeConfig, 'version' | 'xsl' | 'credits' | 'minify'>,
): string {
  const xmlParts: string[] = []
  const xslHref = xsl ? resolvers.relativeBaseUrlResolver(xsl) : false

  // XML declaration and stylesheet on same line if xsl exists
  if (xslHref) {
    xmlParts.push(`<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="${xslHref}"?>`)
  }
  else {
    xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>')
  }

  // Opening tag with namespaces
  xmlParts.push('<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

  // Process URLs
  for (const url of urls) {
    xmlParts.push(buildUrlXml(url))
  }

  // Closing tag
  xmlParts.push('</urlset>')

  // Credits
  if (credits) {
    xmlParts.push(`<!-- XML Sitemap generated by @nuxtjs/sitemap v${version} at ${new Date().toISOString()} -->`)
  }

  // Join and minify if needed
  const xml = xmlParts.join(minify ? '' : '\n')

  return minify
    ? xml.replace(/(?<!<[^>]*)\s(?![^<]*>)/g, '')
    : xml
}
