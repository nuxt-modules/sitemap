import type { H3Event } from 'h3'
import { appendResponseHeader, getRequestHeader, getResponseHeader, removeResponseHeader, setResponseHeader } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'
import { logger } from '../../utils-pure'
import { hasNonIdentityEncoding, isReadableStream, negotiateCompressionEncoding } from '../sitemap/stream'

let warnedAboutCompressionStream = false

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
    response.body = toByteStream(response.body).pipeThrough(compression)
    removeResponseHeader(event, 'Content-Length')
    setResponseHeader(event, 'Content-Encoding', encoding)
  })
})
