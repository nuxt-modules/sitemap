import { defineSitemapEventHandler } from '#imports'

export default defineSitemapEventHandler(() => {
  const posts = Array.from({ length: 5 }, (_, i) => i + 1)
  return [
    '/users-lazy/1',
    '/users-lazy/2',
    '/users-lazy/3',
    ...posts.map(post => ({
      loc: `/blog/post-${post}`,
    })),
  ]
})
