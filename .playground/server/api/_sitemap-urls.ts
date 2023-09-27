import { defineEventHandler } from 'h3'

export default defineEventHandler((e) => {
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
