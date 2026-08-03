// @ts-expect-error alias module
import { serverQueryContent } from '#content/server'
import { defineEventHandler } from '#nuxtseo/h3'

interface ContentWithSitemap {
  sitemap?: unknown
}

export default defineEventHandler(async (e) => {
  const contentList = (await serverQueryContent(e).find()) as ContentWithSitemap[]
  return contentList.map(c => c.sitemap).filter(Boolean)
})
