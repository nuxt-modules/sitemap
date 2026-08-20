import { defineSitemapEventHandler } from '#imports'

// Used by test/e2e/i18n/custom-sitemaps-i18n.test.ts to verify that a custom
// sitemap's `sources` survive the i18n multi-sitemap expansion (#617).
export default defineSitemapEventHandler(() => {
  return [
    {
      loc: '/dynamic-source-page',
      _i18nTransform: true,
    },
  ]
})
