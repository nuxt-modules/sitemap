import type { SitemapReference } from './parse'

// `(?:(?!$)\s)*` is whitespace that is not a line break: with the m flag `$`
// holds before every line terminator. A plain `\s*` also matches line breaks,
// so `^\s*` ran from every line start across all following blank lines, which
// made a body of blank lines quadratic. Each match now stays on one line.
const ROBOTS_SITEMAP_LINE = /^(?:(?!$)\s)*sitemap(?:(?!$)\s)*:(?:(?!$)\s)*(\S+)(?:(?!$)\s)*$/gim

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
