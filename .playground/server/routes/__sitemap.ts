import { defineSitemapEventHandler } from '#imports'

export default defineSitemapEventHandler(() => {
  const posts = Array.from({ length: 3 }, (_, i) => i + 1)
  return [
    ...posts.map(post => ({
      loc: `/blog/${post}`,
    })),
  ]
})
