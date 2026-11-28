import type { SitemapReference } from './parse'

// Horizontal whitespace only (`[^\S\r\n\u2028\u2029]` excludes every ECMAScript
// line terminator). A plain `\s*` matches line breaks too, so `^\s*` under `/m`
// scanned across all following blank lines from every line start in O(n^2) time.
const ROBOTS_SITEMAP_LINE = /^[^\S\r\n\u2028\u2029]*sitemap[^\S\r\n\u2028\u2029]*:[^\S\r\n\u2028\u2029]*(\S+)[^\S\r\n\u2028\u2029]*$/gim

export function parseRobotsSitemaps(input: string, baseUrl?: string): SitemapReference[] {
  const entries: SitemapReference[] = []
  const seen = new Set<string>()
  for (const match of input.matchAll(ROBOTS_SITEMAP_LINE)) {
    const raw = match[1]
    if (!raw)
      continue
    let loc = raw
    if (baseUrl) {
      try {
        loc = new URL(raw, baseUrl).toString()
      }
      catch {
        continue
      }
    }
    if (seen.has(loc))
      continue
    seen.add(loc)
    entries.push({ loc })
  }
  return entries
}
