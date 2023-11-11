import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return [
    {
      loc: '/__sitemap/url',
      changefreq: 'weekly',
      _i18nTransform: true,
    },
  ]
})
