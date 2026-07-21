import { defineEventHandler, setResponseHeader } from 'h3'
import { recordStreamCancellation, recordStreamPull, resetStreamState } from '../utils/stream-state'

const chunk = new Uint8Array(256 * 1024)

export default defineEventHandler((event) => {
  resetStreamState()
  event.context._isSitemap = true
  setResponseHeader(event, 'Content-Type', 'application/octet-stream')

  return new ReadableStream<Uint8Array>({
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
})
