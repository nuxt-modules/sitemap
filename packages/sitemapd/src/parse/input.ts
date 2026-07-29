import type { SitemapChunk, SitemapInput } from './types'

interface ReadInputSuccess {
  _tag: 'success'
  bytes: Uint8Array
  bytesRead: number
}

interface ReadInputLimit {
  _tag: 'limit'
  bytesRead: number
}

export type ReadInputResult = ReadInputSuccess | ReadInputLimit

export interface SitemapInputStats {
  bytesRead: number
  compressed: boolean
}

export interface SitemapInputFailure extends Error {
  _tag: 'sitemap_input_failure'
  reason: 'decoded_limit' | 'invalid_utf8' | 'malformed'
}

function inputFailure(
  reason: SitemapInputFailure['reason'],
  message: string,
): SitemapInputFailure {
  return Object.assign(new Error(message), {
    _tag: 'sitemap_input_failure' as const,
    reason,
  })
}

export function isSitemapInputFailure(error: unknown): error is SitemapInputFailure {
  return Boolean(
    error
    && typeof error === 'object'
    && '_tag' in error
    && error._tag === 'sitemap_input_failure',
  )
}

function isReadableStream(input: SitemapInput): input is ReadableStream<SitemapChunk> {
  return typeof input === 'object'
    && input !== null
    && 'getReader' in input
    && typeof input.getReader === 'function'
}

function isAsyncIterable(input: SitemapInput): input is AsyncIterable<SitemapChunk> {
  return typeof input === 'object'
    && input !== null
    && Symbol.asyncIterator in input
}

function isIterable(input: SitemapInput): input is Iterable<SitemapChunk> {
  return typeof input === 'object'
    && input !== null
    && Symbol.iterator in input
}

async function* streamChunks<T>(stream: ReadableStream<T>): AsyncGenerator<T> {
  const reader = stream.getReader()
  let done = false
  try {
    while (!done) {
      const next = await reader.read()
      done = next.done
      if (next.value !== undefined)
        yield next.value
    }
  }
  finally {
    if (!done)
      await reader.cancel('sitemap input stopped before completion')
    reader.releaseLock()
  }
}

async function* chunks(input: SitemapInput): AsyncGenerator<SitemapChunk> {
  if (typeof input === 'string' || input instanceof Uint8Array) {
    yield input
    return
  }
  if (isReadableStream(input)) {
    yield* streamChunks(input)
    return
  }
  if (isAsyncIterable(input)) {
    yield* input
    return
  }
  if (isIterable(input))
    yield* input
}

async function* byteChunks(input: SitemapInput): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder()
  for await (const chunk of chunks(input))
    yield typeof chunk === 'string' ? encoder.encode(chunk) : chunk
}

async function* replayBytes(
  initial: readonly Uint8Array[],
  iterator: AsyncIterator<Uint8Array>,
): AsyncGenerator<Uint8Array> {
  let done = false
  try {
    yield* initial
    while (!done) {
      const next = await iterator.next()
      done = Boolean(next.done)
      if (next.value)
        yield next.value
    }
  }
  finally {
    if (!done)
      await iterator.return?.()
  }
}

function iteratorStream(iterator: AsyncIterator<Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await iterator.next()
      if (next.done) {
        controller.close()
        return
      }
      if (next.value)
        controller.enqueue(next.value)
    },
    async cancel() {
      await iterator.return?.()
    },
  })
}

function gzipPrefix(chunks: readonly Uint8Array[]): boolean {
  const first = chunks.flatMap(chunk => [...chunk.subarray(0, 2)])
  return first.length >= 2 && first[0] === 0x1F && first[1] === 0x8B
}

export async function* decodedTextChunks(
  input: SitemapInput,
  maxDecodedBytes: number,
  stats: SitemapInputStats,
): AsyncGenerator<string> {
  const iterator = byteChunks(input)[Symbol.asyncIterator]()
  const initial: Uint8Array[] = []
  let prefixBytes = 0
  while (prefixBytes < 2) {
    const next = await iterator.next()
    if (next.done)
      break
    if (next.value) {
      initial.push(next.value)
      prefixBytes += next.value.byteLength
    }
  }

  stats.compressed = gzipPrefix(initial)
  const replay = replayBytes(initial, iterator)
  const decodedBytes: AsyncIterable<Uint8Array> = stats.compressed
    ? streamChunks(
        iteratorStream(replay[Symbol.asyncIterator]()).pipeThrough(
          new DecompressionStream('gzip') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>,
        ),
      )
    : replay
  const decoder = new TextDecoder('utf-8', { fatal: true })

  try {
    for await (const bytes of decodedBytes) {
      stats.bytesRead += bytes.byteLength
      if (stats.bytesRead > maxDecodedBytes) {
        throw inputFailure(
          'decoded_limit',
          `Sitemap exceeds ${maxDecodedBytes} decoded bytes`,
        )
      }
      let text: string
      try {
        text = decoder.decode(bytes, { stream: true })
      }
      catch {
        throw inputFailure('invalid_utf8', 'Sitemap contains invalid UTF-8')
      }
      if (text)
        yield text
    }
    const tail = decoder.decode()
    if (tail)
      yield tail
  }
  catch (error) {
    if (isSitemapInputFailure(error) || !stats.compressed)
      throw error
    throw inputFailure(
      'malformed',
      error instanceof Error ? error.message : 'Invalid gzip sitemap body',
    )
  }
}

export async function readInput(input: SitemapInput, maxBytes: number): Promise<ReadInputResult> {
  const collected: Uint8Array[] = []
  let bytesRead = 0
  for await (const bytes of byteChunks(input)) {
    bytesRead += bytes.byteLength
    if (bytesRead > maxBytes)
      return { _tag: 'limit', bytesRead }
    collected.push(bytes)
  }
  const output = new Uint8Array(bytesRead)
  let offset = 0
  for (const chunk of collected) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { _tag: 'success', bytes: output, bytesRead }
}
