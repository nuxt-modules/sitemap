import { defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
  return [
    {
      loc: '/__sitemap/url',
      changefreq: 'weekly',
    },
  ]
})
