import { bench, describe } from 'vitest'
import { sortSitemapUrls } from '../../src/runtime/server/sitemap/urlset/sort'
import { normaliseEntry, preNormalizeEntry } from '../../src/runtime/server/sitemap/urlset/normalise'
import { escapeValueForXml } from '../../src/runtime/server/sitemap/builder/xml'
import { XmlStringBuilder } from '../../src/runtime/server/sitemap/builder/string-builder'
import { extractSitemapXML } from '../../src/runtime/server/sitemap/utils/extractSitemapXML'
import { resolveSitemapSources } from '../../src/runtime/server/sitemap/urlset/sources'
import { resolveSitemapEntries } from '../../src/runtime/server/sitemap/builder/sitemap'
import { pathCache } from '../../src/runtime/server/sitemap/cache/path-cache'

// Generate test data
function generateUrls(count: number): string[] {
  const urls: string[] = []
  for (let i = 0; i < count; i++) {
    // Mix of different URL patterns
    if (i % 10 === 0) {
      urls.push(`/category/subcategory/page-${i}`)
    }
    else if (i % 5 === 0) {
      urls.push(`/products/item-${i}`)
    }
    else if (i % 3 === 0) {
      urls.push(`/blog/post-${i}`)
    }
    else {
      urls.push(`/page-${i}`)
    }
  }
  return urls
}

function generateSitemapEntries(count: number): any[] {
  const entries: any[] = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const entry: any = {
      loc: `/page-${i}`,
      _key: `/page-${i}`,
    }

    // Add complexity to some entries
    if (i % 3 === 0) {
      entry.lastmod = new Date(now - i * 86400000).toISOString()
    }
    if (i % 5 === 0) {
      entry.images = [
        { loc: `/image1-${i}.jpg` },
        { loc: `/image2-${i}.jpg` },
      ]
    }
    if (i % 7 === 0) {
      entry.alternatives = [
        { hreflang: 'en', href: `/en/page-${i}` },
        { hreflang: 'fr', href: `/fr/page-${i}` },
      ]
    }

    entries.push(entry)
  }
  return entries
}

function generateXml(count: number): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?><urlset>'
  for (let i = 0; i < count; i++) {
    xml += `<url><loc>https://example.com/page-${i}</loc>`
    if (i % 2 === 0) {
      xml += `<lastmod>2023-01-${String(i % 31 + 1).padStart(2, '0')}</lastmod>`
    }
    if (i % 3 === 0) {
      xml += `<changefreq>daily</changefreq><priority>0.${i % 10}</priority>`
    }
    if (i % 5 === 0) {
      xml += `<image:image><image:loc>https://example.com/image-${i}.jpg</image:loc></image:image>`
    }
    xml += '</url>'
  }
  xml += '</urlset>'
  return xml
}

describe('Sorting Performance', () => {
  const sizes = [100, 1000, 10000]

  sizes.forEach((size) => {
    const urls = generateUrls(size)

    bench(`sort ${size} URLs`, () => {
      sortSitemapUrls([...urls]) // Clone to avoid mutation
    })
  })
})

describe('Normalization Performance', () => {
  const sizes = [100, 1000, 10000]

  sizes.forEach((size) => {
    const entries = generateSitemapEntries(size)
    const defaults = { priority: 0.5, changefreq: 'daily' as const }

    bench(`normalize ${size} entries`, () => {
      entries.forEach((entry) => {
        normaliseEntry({ ...entry }, defaults)
      })
    })

    bench(`normalize ${size} entries with cache (2nd pass)`, () => {
      entries.forEach((entry) => {
        const normalized = { ...entry, _normalized: true }
        normaliseEntry(normalized, defaults)
      })
    })

    bench(`pre-normalize ${size} entries`, () => {
      entries.forEach((entry) => {
        preNormalizeEntry(entry)
      })
    })
  })
})

describe('XML String Building Performance', () => {
  const sizes = [100, 1000, 10000]

  sizes.forEach((size) => {
    bench(`build XML string with ${size} URLs`, () => {
      const builder = new XmlStringBuilder()
      builder.append('<urlset>')

      for (let i = 0; i < size; i++) {
        builder.appendLine()
        builder.append(`  <url>`)
        builder.appendLine()
        builder.append(`    <loc>https://example.com/page-${i}</loc>`)
        if (i % 2 === 0) {
          builder.appendLine()
          builder.append(`    <lastmod>2023-01-01</lastmod>`)
        }
        builder.appendLine()
        builder.append(`  </url>`)
      }

      builder.appendLine()
      builder.append('</urlset>')
      builder.toString()
    })

    // Compare with traditional string concatenation
    bench(`concatenate XML string with ${size} URLs (baseline)`, () => {
      let xml = '<urlset>'

      for (let i = 0; i < size; i++) {
        xml += '\n  <url>'
        xml += `\n    <loc>https://example.com/page-${i}</loc>`
        if (i % 2 === 0) {
          xml += '\n    <lastmod>2023-01-01</lastmod>'
        }
        xml += '\n  </url>'
      }

      xml += '\n</urlset>'
    })
  })
})

describe('XML Escaping Performance', () => {
  const testStrings = [
    'Normal text without special characters',
    'Text with & ampersand',
    'Text with <tags> and </tags>',
    'Text with "quotes" and \'apostrophes\'',
    'Text with all & < > " \' special chars',
  ]

  const iterations = 100000

  testStrings.forEach((str) => {
    bench(`escape "${str.slice(0, 30)}..." ${iterations} times`, () => {
      for (let i = 0; i < iterations; i++) {
        escapeValueForXml(str)
      }
    })
  })
})

describe('XML Parsing Performance', () => {
  const sizes = [100, 1000, 10000]

  sizes.forEach((size) => {
    const xml = generateXml(size)

    bench(`parse ${size} URLs from XML`, () => {
      extractSitemapXML(xml)
    })
  })
})

describe('Source Resolution Performance', () => {
  const sizes = [10, 50, 100]

  sizes.forEach((size) => {
    const sources = Array.from({ length: size }, (_, i) => ({
      context: { name: `source-${i}` },
      urls: generateUrls(10),
    }))

    bench(`resolve ${size} sources`, async () => {
      await resolveSitemapSources(sources)
    })
  })
})

describe('Path Cache Performance', () => {
  const sizes = [100, 1000, 10000]

  sizes.forEach((size) => {
    bench(`cache ${size} paths`, () => {
      pathCache.clear()
      for (let i = 0; i < size; i++) {
        pathCache.set(`/path-${i}`, `https://example.com/path-${i}`)
      }
    })

    bench(`retrieve ${size} cached paths`, () => {
      for (let i = 0; i < size; i++) {
        pathCache.get(`/path-${i}`)
      }
    })
  })
})

describe('Complete Sitemap Processing', () => {
  const sizes = [100, 1000, 5000]

  sizes.forEach((size) => {
    const sitemap = {
      include: ['/**'],
      exclude: ['/admin/**'],
      sitemapName: 'default',
    }

    const urls = generateSitemapEntries(size)
    const runtimeConfig = {
      autoI18n: undefined,
      isI18nMapped: false,
    }

    bench(`process ${size} URLs end-to-end`, () => {
      resolveSitemapEntries(sitemap, [...urls], runtimeConfig)
    })
  })
})

// Memory usage tracking (optional)
describe('Memory Usage', () => {
  bench('measure heap usage for 10000 URLs', () => {
    const entries = generateSitemapEntries(10000)
    const sitemap = {
      include: ['/**'],
      exclude: [],
      sitemapName: 'default',
    }
    const runtimeConfig = {
      autoI18n: undefined,
      isI18nMapped: false,
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }

    const before = process.memoryUsage().heapUsed
    resolveSitemapEntries(sitemap, entries, runtimeConfig)
    const after = process.memoryUsage().heapUsed

    // Log memory usage (won't affect benchmark timing)
    console.log(`Memory used: ${((after - before) / 1024 / 1024).toFixed(2)} MB`)
  })
})
