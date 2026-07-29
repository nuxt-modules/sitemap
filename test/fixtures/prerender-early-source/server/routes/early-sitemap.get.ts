import { defineEventHandler } from 'h3'

export default defineEventHandler(event => event.$fetch('/sitemap.xml'))
