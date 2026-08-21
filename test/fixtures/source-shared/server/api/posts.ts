import { defineEventHandler } from 'h3'

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var __sharedSourceCallCount: number
}

globalThis.__sharedSourceCallCount ??= 0

export default defineEventHandler(() => {
  globalThis.__sharedSourceCallCount++
  return [
    { loc: '/posts/1' },
    { loc: '/posts/2' },
  ]
})
