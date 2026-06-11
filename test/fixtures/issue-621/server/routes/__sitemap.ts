import { defineSitemapEventHandler } from '#imports'

// Dynamic URLs from a custom source, each tagged with its locale's `language`
// tag via `_sitemap`, exactly as described in issue #621.
export default defineSitemapEventHandler(() => {
  return [
    { loc: '/zh/about', _sitemap: 'zh' },
    { loc: '/zh/contact', _sitemap: 'zh' },
    { loc: '/tw/about', _sitemap: 'zh-Hant' },
    { loc: '/tw/contact', _sitemap: 'zh-Hant' },
  ]
})
