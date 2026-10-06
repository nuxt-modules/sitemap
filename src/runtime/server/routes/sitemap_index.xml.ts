import { defineEventHandler } from 'nuxt/server'
import { sitemapIndexXmlEventHandler } from '../sitemap/event-handlers'

export default defineEventHandler(sitemapIndexXmlEventHandler)
