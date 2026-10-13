// Frontmatter keys that hold when a page last changed, read first.
const MODIFIED_DATE_KEYS = ['updatedAt', 'modifiedAt', 'dateModified', 'lastModified'] as const
// Keys that hold when a page was published. For a page not edited since, that is its last change.
const PUBLISHED_DATE_KEYS = ['publishedAt', 'datePublished', 'date'] as const

type ContentDate = string | Date

function asContentDate(value: unknown): ContentDate | undefined {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? undefined : value
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Date.parse(value)))
    return value
  return undefined
}

/**
 * The `lastmod` of a content page, read from its frontmatter.
 *
 * A modification date wins over a publication date. `seo.articleModifiedTime` and
 * `seo.articlePublishedTime` come first in each group. A key the collection schema does not
 * declare is read from `meta`, where Nuxt Content keeps undeclared frontmatter.
 */
export function resolveContentLastmod(content: Record<string, unknown>): ContentDate | undefined {
  const seo = (content.seo || {}) as Record<string, unknown>
  const meta = (content.meta || {}) as Record<string, unknown>
  const read = (key: string) => content[key] ?? meta[key]
  const candidates = [
    seo.articleModifiedTime,
    ...MODIFIED_DATE_KEYS.map(read),
    seo.articlePublishedTime,
    ...PUBLISHED_DATE_KEYS.map(read),
  ]
  for (const candidate of candidates) {
    const date = asContentDate(candidate)
    if (date)
      return date
  }
  return undefined
}
