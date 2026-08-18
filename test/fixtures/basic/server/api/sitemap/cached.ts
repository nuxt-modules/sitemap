import { defineSitemapEventHandler } from '#imports'

export default defineSitemapEventHandler(() => {
  return [
    { loc: '/cached-source/foo' },
  ]
}, {
  maxAge: 60,
  name: 'sitemap-test-cached',
})
