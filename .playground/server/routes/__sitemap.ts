import { defineEventHandler } from 'h3'

export default defineEventHandler(e => {
  const posts = Array.from({ length: 3 }, (_, i) => i + 1)
  return [
    ...posts.map(post => ({
      loc: `/blog/${post}`
    }))
  ]
})
