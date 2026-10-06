import { defineEventHandler } from 'nuxt/server'
import { sitemapXmlEventHandler } from '../sitemap/event-handlers'

export default defineEventHandler(sitemapXmlEventHandler)
