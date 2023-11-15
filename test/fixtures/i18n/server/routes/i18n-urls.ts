import { defineSitemapEventHandler } from '#imports'

export default defineSitemapEventHandler(() => {
  return [
    {
      loc: '/en/dynamic/foo',
    },
    {
      loc: '/fr/dynamic/foo',
    },
  ]
})
