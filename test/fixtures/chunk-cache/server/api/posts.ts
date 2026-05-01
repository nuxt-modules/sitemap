import { defineEventHandler } from 'h3'

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var __postsSourceCallCount: number
}

globalThis.__postsSourceCallCount ??= 0

export default defineEventHandler(() => {
  globalThis.__postsSourceCallCount++
  return Array.from({ length: 17 }, (_, i) => ({
    loc: `/posts/${i + 1}`,
  }))
})
