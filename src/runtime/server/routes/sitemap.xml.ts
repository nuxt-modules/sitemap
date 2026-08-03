import { defineEventHandler } from '#nuxtseo/h3'
import { sitemapXmlEventHandler } from '../sitemap/event-handlers'

export default defineEventHandler(sitemapXmlEventHandler)
