import { bench, describe } from 'vitest'
import { parseSitemap } from '../src/parse'

const urlCount = 10_000
const xml = `<urlset>${Array.from(
  { length: urlCount },
  (_, index) => `<url><loc>https://example.com/${index}</loc><lastmod>2026-01-01</lastmod></url>`,
).join('')}</urlset>`
const bytes = new TextEncoder().encode(xml)

describe('incremental sitemap parsing', () => {
  bench('10k URLs in 64 KiB chunks', async () => {
    const chunks = (async function* () {
      for (let offset = 0; offset < bytes.length; offset += 64 * 1024)
        yield bytes.subarray(offset, offset + 64 * 1024)
    })()
    for await (const _event of parseSitemap(chunks)) {
      // Consume without retaining entries.
    }
  }, { iterations: 10 })
})
