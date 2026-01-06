import { defineSitemapEventHandler } from '#imports'

export default defineSitemapEventHandler(() => {
  return [
    // Static routes
    {
      loc: '/test',
      _i18nTransform: true,
    },
    {
      loc: '/about',
      _i18nTransform: true,
    },
    {
      loc: '/__sitemap/url',
      changefreq: 'weekly',
    },
    // Dynamic route with single parameter (issue #542)
    {
      loc: '/posts/my-slug',
      _i18nTransform: true,
    },
    // Dynamic route with multiple parameters
    {
      loc: '/products/electronics/laptop-123',
      _i18nTransform: true,
    },
  ]
})
