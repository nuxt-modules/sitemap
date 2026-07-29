import type { SitemapReference } from './parse'

export function parseRobotsSitemaps(input: string, baseUrl?: string): SitemapReference[] {
  const entries: SitemapReference[] = []
  const seen = new Set<string>()
  for (const match of input.matchAll(/^\s*sitemap\s*:\s*(\S+)\s*$/gim)) {
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
