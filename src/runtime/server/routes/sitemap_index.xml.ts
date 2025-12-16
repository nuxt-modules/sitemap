import { defineEventHandler } from 'h3'
import { sitemapIndexXmlEventHandler } from '../sitemap/event-handlers'

export default defineEventHandler(sitemapIndexXmlEventHandler)
