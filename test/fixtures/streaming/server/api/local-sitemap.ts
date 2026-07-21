import { defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
  return event.$fetch<string>('/__sitemap__/posts.xml', {
    headers: { 'Accept-Encoding': 'identity' },
  })
})
