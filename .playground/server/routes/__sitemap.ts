import { defineSitemapEventHandler, defineSitemapUrls } from '#imports'

export default defineSitemapEventHandler(() => {
  const posts = Array.from({ length: 3 }, (_, i) => i + 1)
  return defineSitemapUrls([
    ...posts.map(post => ({
      loc: `/blog/${post}`,
    })),
  ])
})
