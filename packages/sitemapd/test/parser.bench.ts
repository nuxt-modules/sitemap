import { bench, describe } from 'vitest'
import { collectSitemap, parseSitemap } from '../src/parse'

function sitemapBytes(urlCount: number, pathSegments: number): Uint8Array {
  const path = 'category-segment/'.repeat(pathSegments)
  let xml = '<urlset>'
  for (let index = 0; index < urlCount; index++)
    xml += `<url><loc>https://example.com/${path}${index}</loc><lastmod>2026-01-01</lastmod></url>`
  return new TextEncoder().encode(`${xml}</urlset>`)
}

function chunks(bytes: Uint8Array): AsyncGenerator<Uint8Array> {
  return (async function* () {
    for (let offset = 0; offset < bytes.length; offset += 64 * 1024)
      yield bytes.subarray(offset, offset + 64 * 1024)
  })()
}

async function consume(bytes: Uint8Array): Promise<void> {
  for await (const _event of parseSitemap(chunks(bytes))) {
    // Consume without retaining entries.
  }
}

async function collect(bytes: Uint8Array): Promise<void> {
  const result = await collectSitemap(chunks(bytes))
  if (result._tag !== 'document')
    throw new Error('Benchmark sitemap did not parse completely')
}

const oneMiB = sitemapBytes(10_000, 2)
const tenMiB = sitemapBytes(50_000, 8)
const tenMiBString = new TextDecoder().decode(tenMiB)
const mib = (bytes: Uint8Array) => (bytes.byteLength / 1024 / 1024).toFixed(1)

describe('incremental sitemap parsing', () => {
  bench(`${mib(oneMiB)} MiB stream, 10k URLs`, () => consume(oneMiB), { iterations: 10 })
  bench(`${mib(tenMiB)} MiB stream, 50k URLs`, () => consume(tenMiB), { iterations: 5 })
  bench(`${mib(tenMiB)} MiB string, 50k URLs`, async () => {
    for await (const _event of parseSitemap(tenMiBString)) {
      // Consume without retaining entries.
    }
  }, { iterations: 5 })
  bench(`${mib(tenMiB)} MiB retained, 50k URLs`, () => collect(tenMiB), { iterations: 5 })
})
