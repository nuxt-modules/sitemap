export default defineEventHandler(e => {
  const posts = Array.from({ length: 50 }, (_, i) => i + 1)
  return [
    '/users-lazy/1',
    '/users-lazy/2',
    '/users-lazy/3',
    ...posts.map(post => `/blog/post-${post}`)
  ]
})
