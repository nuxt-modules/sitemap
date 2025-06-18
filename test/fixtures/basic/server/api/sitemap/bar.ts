import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  const posts = Array.from({ length: 5 }, (_, i) => i + 1)
  return [
    ...posts.map(post => ({
      loc: `/bar/${post}`,
    })),
  ]
})