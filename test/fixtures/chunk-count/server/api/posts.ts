import { defineEventHandler } from 'h3'

declare global {
  // eslint-disable-next-line vars-on-top, no-var
  var __chunkCountPostsCalls: number
}

globalThis.__chunkCountPostsCalls ??= 0

export default defineEventHandler(() => {
  globalThis.__chunkCountPostsCalls++
  return Array.from({ length: 17 }, (_, i) => ({ loc: `/posts/${i + 1}` }))
})
