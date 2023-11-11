import { defineSitemapEventHandler, defineSitemapUrls } from '#imports'

export default defineSitemapEventHandler(() => {
  return defineSitemapUrls([
    '/foo/1',
    '/foo/2',
    '/foo/3',
  ])
})
