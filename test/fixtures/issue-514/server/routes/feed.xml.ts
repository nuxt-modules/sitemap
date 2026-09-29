import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((e) => {
  setHeader(e, 'content-type', 'application/xml')
  return '<rss version="2.0"><channel><title>Feed</title></channel></rss>'
})
