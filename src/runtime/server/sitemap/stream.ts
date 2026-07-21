export const DEFAULT_XML_STREAM_CHUNK_SIZE = 64 * 1024

export type SitemapCompressionEncoding = 'gzip' | 'deflate'

interface NodeResponseWritable {
  once: (event: 'drain', listener: () => void) => unknown
  write: (chunk: Uint8Array) => boolean
}

export interface NodeResponseStream {
  abort: (reason?: unknown) => void
  on: {
    (event: 'end', listener: () => void): NodeResponseStream
    (event: 'error', listener: (error: unknown) => void): NodeResponseStream
  }
  pipe: (destination: NodeResponseWritable) => NodeResponseWritable
}

export function isReadableStream(value: unknown): value is ReadableStream<Uint8Array> {
  return !!value && typeof value === 'object' && typeof (value as ReadableStream).getReader === 'function'
}

export function hasNonIdentityEncoding(value: unknown): boolean {
  return (Array.isArray(value) ? value : [value])
    .flatMap(encoding => String(encoding || '').split(','))
    .some(encoding => encoding.trim().toLowerCase() !== 'identity' && encoding.trim() !== '')
}

/**
 * Adapt a Web stream to the small Node stream surface H3 consumes. H3 v1 writes
 * Web streams without waiting for `drain`; this adapter keeps production Node
 * responses pull-driven and forwards disconnects to the Web stream's `cancel()`.
 */
export function createNodeResponseStream(
  source: ReadableStream<Uint8Array>,
  onCancelError: (error: unknown) => void,
): NodeResponseStream {
  const reader = source.getReader()
  const endListeners = new Set<() => void>()
  const errorListeners = new Set<(error: unknown) => void>()
  let aborted = false
  let pumping = false
  let releaseBackpressure: (() => void) | undefined

  const stream: NodeResponseStream = {
    abort(reason) {
      if (aborted)
        return
      aborted = true
      releaseBackpressure?.()
      releaseBackpressure = undefined
      void reader.cancel(reason).catch(onCancelError)
    },
    on(event: 'end' | 'error', listener: (() => void) | ((error: unknown) => void)) {
      if (event === 'end')
        endListeners.add(listener as () => void)
      else
        errorListeners.add(listener as (error: unknown) => void)
      return stream
    },
    pipe(destination) {
      if (pumping)
        return destination
      pumping = true

      void (async () => {
        try {
          while (true) {
            if (aborted)
              break
            const result = await reader.read()
            if (result.done)
              break

            if (!destination.write(result.value)) {
              await new Promise<void>((resolve) => {
                releaseBackpressure = resolve
                destination.once('drain', resolve)
              })
              releaseBackpressure = undefined
            }
          }

          if (!aborted) {
            for (const listener of endListeners)
              listener()
          }
        }
        catch (error) {
          if (!aborted) {
            for (const listener of errorListeners)
              listener(error)
          }
        }
      })()

      return destination
    },
  }

  return stream
}

/**
 * Convert synchronous XML fragments into a pull-driven byte stream. Fragments are
 * batched so large sitemaps do not enqueue one tiny chunk per URL.
 */
export function createChunkedXmlStream(chunks: Iterable<string>, targetChunkSize = DEFAULT_XML_STREAM_CHUNK_SIZE): ReadableStream<Uint8Array> {
  const iterator = chunks[Symbol.iterator]()
  const encoder = new TextEncoder()
  const chunkSize = Math.max(1, Math.floor(targetChunkSize))
  let complete = false
  let pending: string | undefined
  let pendingOffset = 0

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (complete)
        return

      let output = ''
      while (output.length < chunkSize) {
        if (!pending) {
          const next = iterator.next()
          if (next.done) {
            complete = true
            break
          }
          pending = next.value
          pendingOffset = 0
          if (!pending)
            continue
        }

        const remaining = chunkSize - output.length
        let end = Math.min(pending.length, pendingOffset + remaining)
        // Do not split a UTF-16 surrogate pair before passing each chunk to TextEncoder.
        if (end < pending.length && end > pendingOffset && pending.charCodeAt(end - 1) >= 0xD800 && pending.charCodeAt(end - 1) <= 0xDBFF) {
          end--
          if (end === pendingOffset) {
            if (output)
              break
            end = Math.min(pending.length, pendingOffset + 2)
          }
        }

        output += pending.slice(pendingOffset, end)
        pendingOffset = end
        if (pendingOffset === pending.length)
          pending = undefined
      }

      if (output)
        controller.enqueue(encoder.encode(output))
      if (complete)
        controller.close()
    },
    cancel() {
      complete = true
      iterator.return?.()
    },
  })
}

/** Select the best compression format supported by CompressionStream. */
export function negotiateCompressionEncoding(acceptEncoding: string): SitemapCompressionEncoding | null {
  if (!acceptEncoding.trim())
    return null

  const explicit = new Map<string, number>()
  let wildcard: number | undefined

  for (const value of acceptEncoding.split(',')) {
    const [rawEncoding, ...parameters] = value.trim().toLowerCase().split(';')
    if (!rawEncoding)
      continue

    let quality = 1
    for (const parameter of parameters) {
      const [key, rawValue] = parameter.trim().split('=')
      if (key === 'q') {
        const parsed = Number.parseFloat(rawValue || '')
        quality = Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0
      }
    }

    if (rawEncoding === '*')
      wildcard = quality
    else
      explicit.set(rawEncoding, quality)
  }

  const gzipQuality = explicit.get('gzip') ?? wildcard ?? 0
  const deflateQuality = explicit.get('deflate') ?? wildcard ?? 0
  if (gzipQuality <= 0 && deflateQuality <= 0)
    return null
  return gzipQuality >= deflateQuality ? 'gzip' : 'deflate'
}
