import { defineEventHandler } from 'h3'
import { serverQueryContent } from '#content/server'

export default defineEventHandler(async (e) => {
  const contentList = await serverQueryContent(e).find()
  return contentList.map(c => c.sitemap).filter(Boolean)
})
