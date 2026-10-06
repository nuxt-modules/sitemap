import type { RequestEvent } from 'nuxt/server'
import { logger } from '../../utils-pure'
import { hasNonIdentityEncoding, negotiateCompressionEncoding } from './stream'

let warnedAboutCompressionStream = false
const NODE_COMPRESSION_INPUT_BATCH_BYTES = 512 * 1024

function toByteStream(body: string | ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  return typeof body === 'string' ? new Blob([body]).stream() : body
}

function createNodeCompressionInputStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = source.getReader()
  let bytesRead = 0

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (bytesRead >= NODE_COMPRESSION_INPUT_BATCH_BYTES) {
        bytesRead = 0
        await new Promise<void>(resolve => setTimeout(resolve, 0))
      }

      const result = await reader.read()
      if (result.done) {
        controller.close()
        return
      }

      bytesRead += result.value.byteLength
      controller.enqueue(result.value)
    },
    cancel(reason) {
      return reader.cancel(reason)
    },
  })
}

/** Compress each response after plain XML caching and before the builder creates its response. */
export function compressSitemapOutput(event: RequestEvent, body: string | ReadableStream<Uint8Array>, enabled: boolean): string | ReadableStream<Uint8Array> {
  if (!enabled || import.meta.prerender)
    return body
  const headers = event.res.headers
  const vary = (headers.get('Vary') || '').split(',').map(value => value.trim().toLowerCase())
  if (!vary.includes('*') && !vary.includes('accept-encoding'))
    headers.append('Vary', 'Accept-Encoding')
  if (hasNonIdentityEncoding(headers.get('Content-Encoding')))
    return body
  const encoding = negotiateCompressionEncoding(event.req.headers.get('accept-encoding') || '')
  if (!encoding)
    return body
  if (typeof CompressionStream === 'undefined') {
    if (!warnedAboutCompressionStream) {
      warnedAboutCompressionStream = true
      logger.warn('Sitemap compression was requested, but CompressionStream is unavailable in this runtime. Sending the uncompressed response.')
    }
    return body
  }
  const compression = new CompressionStream(encoding) as unknown as TransformStream<Uint8Array, Uint8Array>
  // Bounded yields let backpressure and cancellation reach synchronous XML sources.
  const stream = createNodeCompressionInputStream(toByteStream(body)).pipeThrough(compression)
  headers.delete('Content-Length')
  headers.set('Content-Encoding', encoding)
  return stream
}
