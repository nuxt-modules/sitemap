import { defineEventHandler } from 'h3'
// @ts-expect-error alias module
import { serverQueryContent } from '#content/server'

interface ContentWithSitemap {
  sitemap?: unknown
}

export default defineEventHandler(async (e) => {
  const contentList = (await serverQueryContent(e).find()) as ContentWithSitemap[]
  return contentList.map(c => c.sitemap).filter(Boolean)
})
