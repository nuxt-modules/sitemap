import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return { count: globalThis.__postsSourceCallCount ?? 0 }
})
