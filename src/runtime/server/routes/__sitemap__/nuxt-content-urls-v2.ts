import { defineEventHandler } from 'h3'
// @ts-expect-error for nuxt v2 - type checking for nuxt v3
import type { ParsedContent } from '@nuxt/content'

// @ts-expect-error alias module
import { serverQueryContent } from '#content/server'

export default defineEventHandler(async (e) => {
  const contentList = (await serverQueryContent(e).find()) as ParsedContent[]
  return contentList.map(c => c.sitemap).filter(Boolean)
})
