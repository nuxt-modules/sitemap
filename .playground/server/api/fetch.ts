import type { asSitemapUrl } from '#imports'
import { defineSitemapEventHandler } from '#imports'

export default defineSitemapEventHandler(async () => {
  return $fetch<ReturnType<typeof asSitemapUrl>[]>('/api/sitemap-urls-to-be-confumsed-by-fetch')
})
