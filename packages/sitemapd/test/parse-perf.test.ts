import { describe, expect, it } from 'vitest'
import { collectSitemap } from '../src/parse'

// Regression guard for a quadratic record scan. `findRecordClose` used to
// lowercase the entire remaining buffer per call, and searched for `<!--` and
// `<![CDATA[` with no upper bound. Ordinary sitemaps contain neither, so both
// searches ran to the end of the document just to report "absent", once per
// record. Parsing therefore scaled with entries x document length: a real
// 40,000-entry, 8.8MB sitemap took about 229 seconds, which is fatal in any
// CPU-bounded runtime (it was killing a Cloudflare Worker mid-request).
//
// The assertions below are deliberately generous. They are not a benchmark;
// they only need to separate linear from quadratic, and the gap is orders of
// magnitude.

function sitemapOf(entries: number): string {
  const urls = Array.from(
    { length: entries },
    (_, index) => `<url><loc>https://example.com/products/item-${index}-with-a-realistic-length-slug</loc><lastmod>2026-08-01</lastmod></url>`,
  ).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
}

async function timeParse(entries: number): Promise<{ ms: number, parsed: number }> {
  const xml = sitemapOf(entries)
  const started = performance.now()
  const result = await collectSitemap(xml, {
    maxDecodedBytes: Number.MAX_SAFE_INTEGER,
    maxEntries: entries + 1,
  })
  const ms = performance.now() - started
  return {
    ms,
    parsed: result._tag === 'document' ? result.document.entries.length : -1,
  }
}

describe('parse performance', () => {
  it('parses a large sitemap in linear time', async () => {
    const { ms, parsed } = await timeParse(8000)

    expect(parsed).toBe(8000)
    // Pre-fix this took ~8.8s; post-fix it is ~0.15s.
    expect(ms).toBeLessThan(5000)
  }, 30_000)

  it('scales sub-quadratically as the document grows', async () => {
    const small = await timeParse(2000)
    const large = await timeParse(8000)

    expect(small.parsed).toBe(2000)
    expect(large.parsed).toBe(8000)

    // 4x the entries. Quadratic growth would be ~16x; linear is ~4x. Allow a
    // very loose 10x so this cannot flake on a noisy machine while still
    // failing outright if the quadratic behaviour returns.
    const growth = large.ms / Math.max(small.ms, 1)
    expect(growth).toBeLessThan(10)
  }, 60_000)
})
