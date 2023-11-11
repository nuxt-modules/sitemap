import { defineSitemapEventHandler } from '#imports'

export default defineSitemapEventHandler(() => {
  return [
    {
      loc: '/__sitemap/url',
      changefreq: 'weekly',
      _i18nTransform: true,
    },
  ]
})
