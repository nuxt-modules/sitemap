import { XMLParser } from 'fast-xml-parser'
import { bench, describe } from 'vitest'
import { parseSitemapXml, parseSitemapXmlStream } from '../../src/utils/parseSitemapXml'

const urlCount = 10_000
const xml = `<urlset>${Array.from({ length: urlCount }, (_, index) => `<url><loc>https://example.com/${index}</loc><lastmod>2026-01-01</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('')}</urlset>`
const bytes = new TextEncoder().encode(xml)

const treeParser = new XMLParser({
  isArray: (tagName: string) => tagName === 'url',
  removeNSPrefix: true,
  trimValues: true,
})

describe('sitemap parsing', () => {
  bench('full XML tree baseline, 10k URLs', () => {
    treeParser.parse(xml)
  }, { iterations: 10 })

  bench('bounded aggregate parser, 10k URLs', async () => {
    await parseSitemapXml(xml)
  }, { iterations: 10 })

  bench('stream parser, 10k URLs in 64 KiB chunks', async () => {
    const chunks = (async function* () {
      for (let offset = 0; offset < bytes.length; offset += 64 * 1024)
        yield bytes.subarray(offset, offset + 64 * 1024)
    })()
    for await (const _event of parseSitemapXmlStream(chunks)) {
      // Consume each event without retaining parsed URLs.
    }
  }, { iterations: 10 })
})
