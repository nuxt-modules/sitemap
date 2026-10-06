import { defineEventHandler } from 'nuxt/server'
import { sitemapChildXmlEventHandler } from '../../sitemap/event-handlers'

export default defineEventHandler(sitemapChildXmlEventHandler)
