import type { H3Event } from 'h3'
import { appendResponseHeader, getRequestHeader, getResponseHeader, removeResponseHeader, setResponseHeader } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'
import { logger } from '../../utils-pure'
import { hasNonIdentityEncoding, isReadableStream, negotiateCompressionEncoding } from '../sitemap/stream'

let warnedAboutCompressionStream = false
const NODE_COMPRESSION_INPUT_BATCH_BYTES = 512 * 1024

function toByteStream(body: unknown): ReadableStream<Uint8Array> {
  if (isReadableStream(body))
    return body
  if (body instanceof Blob)
    return body.stream()

  const value = typeof body === 'string' || body instanceof ArrayBuffer || ArrayBuffer.isView(body)
    ? body
    : JSON.stringify(body)
  return new Blob([value as BlobPart]).stream()
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

function addVaryAcceptEncoding(event: H3Event) {
  const vary = getResponseHeader(event, 'Vary')
  const values = (Array.isArray(vary) ? vary : [vary])
    .flatMap(value => String(value || '').split(','))
    .map(value => value.trim().toLowerCase())
  if (!values.includes('*') && !values.includes('accept-encoding'))
    appendResponseHeader(event, 'Vary', 'Accept-Encoding')
}

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('beforeResponse', (event, response) => {
    if (!event.context._isSitemap || !response.body)
      return

    addVaryAcceptEncoding(event)
    if (hasNonIdentityEncoding(getResponseHeader(event, 'Content-Encoding')))
      return

    const encoding = negotiateCompressionEncoding(getRequestHeader(event, 'accept-encoding') || '')
    if (!encoding)
      return

    if (typeof CompressionStream === 'undefined') {
      if (!warnedAboutCompressionStream) {
        warnedAboutCompressionStream = true
        logger.warn('Sitemap compression was requested, but CompressionStream is unavailable in this runtime. Sending the uncompressed response.')
      }
      return
    }

    const compression = new CompressionStream(encoding) as unknown as TransformStream<Uint8Array, Uint8Array>
    const source = toByteStream(response.body)
    // Node's CompressionStream can drain synchronous input before exposing output.
    // Yield in bounded batches so socket backpressure and cancellation reach the source.
    const compressionInput = event.node.res?.socket
      ? createNodeCompressionInputStream(source)
      : source
    response.body = compressionInput.pipeThrough(compression)
    removeResponseHeader(event, 'Content-Length')
    setResponseHeader(event, 'Content-Encoding', encoding)
  })
})
