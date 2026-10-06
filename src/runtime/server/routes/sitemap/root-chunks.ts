import { defineEventHandler } from 'nuxt/server'
import { sitemapRootChunkEventHandler } from '../../sitemap/event-handlers'

export default defineEventHandler(sitemapRootChunkEventHandler)
