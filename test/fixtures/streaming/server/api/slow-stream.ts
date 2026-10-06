import { defineEventHandler } from 'nuxt/server'
import { compressSitemapOutput } from '../../../../../src/runtime/server/sitemap/compression'
import { recordStreamCancellation, recordStreamPull, resetStreamState } from '../utils/stream-state'

function createIncompressibleChunk(size: number): Uint8Array {
  const chunk = new Uint8Array(size)
  let state = 0x6D2B79F5
  for (let index = 0; index < chunk.length; index++) {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    chunk[index] = state & 0xFF
  }
  return chunk
}

const chunk = createIncompressibleChunk(256 * 1024)

export default defineEventHandler((event) => {
  resetStreamState()
  event.context._isSitemap = true
  event.res.headers.set('Content-Type', 'application/octet-stream')

  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      recordStreamCancellation()
    },
    pull(controller) {
      const pulls = recordStreamPull()
      controller.enqueue(chunk)
      if (pulls === 1000)
        controller.close()
    },
  })
  return compressSitemapOutput(event, stream, true)
})
