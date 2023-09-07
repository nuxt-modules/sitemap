import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return [
    '/__sitemap/url',
    {
      loc: '/__sitemap/loc',
    },
    {
      loc: 'https://nuxtseo.com/__sitemap/abs',
    },
  ]
})
