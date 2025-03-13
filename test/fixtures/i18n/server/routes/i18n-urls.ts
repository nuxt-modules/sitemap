import { defineSitemapEventHandler } from '#sitemap/server/types'

export default defineSitemapEventHandler(() => {
  return [
    {
      loc: '/en/dynamic/foo',
    },
    {
      loc: '/fr/dynamic/foo',
    },
    {
      loc: 'endless-dungeon', // issue with en being picked up as the locale
      _i18nTransform: true,
    },
    {
      loc: 'english-url', // issue with en being picked up as the locale
    },
    // absolute URL issue
    { loc: 'https://www.somedomain.com/abc/def' },
  ]
})
