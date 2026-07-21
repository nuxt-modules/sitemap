import { memoryUsage } from 'node:process'
import { parseSitemapXmlStream } from '../../src/utils/parseSitemapXml'

const totalUrls = Number.parseInt(process.argv[2] || '1000000', 10)
const urlsPerChunk = 1000

async function* generateSitemap() {
  yield '<urlset>'
  for (let offset = 0; offset < totalUrls; offset += urlsPerChunk) {
    let chunk = ''
    const end = Math.min(offset + urlsPerChunk, totalUrls)
    for (let index = offset; index < end; index++)
      chunk += `<url><loc>https://example.com/${index}</loc></url>`
    yield chunk
  }
  yield '</urlset>'
}

globalThis.gc?.()
const heapAtStart = memoryUsage().heapUsed
let peakHeap = heapAtStart
let parsedUrls = 0
const startedAt = performance.now()

for await (const event of parseSitemapXmlStream(generateSitemap())) {
  if (event._tag !== 'url')
    continue
  parsedUrls++
  if (parsedUrls % urlsPerChunk === 0)
    peakHeap = Math.max(peakHeap, memoryUsage().heapUsed)
}

const elapsedMs = performance.now() - startedAt
console.log({
  elapsedMs: Math.round(elapsedMs),
  heapGrowthMiB: Number(((memoryUsage().heapUsed - heapAtStart) / 1024 / 1024).toFixed(2)),
  parsedUrls,
  peakHeapGrowthMiB: Number(((peakHeap - heapAtStart) / 1024 / 1024).toFixed(2)),
  urlsPerSecond: Math.round(parsedUrls / (elapsedMs / 1000)),
})
