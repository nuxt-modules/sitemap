// gzip magic bytes: 1f 8b. Catches both `.xml.gz` sources and servers that respond
// with a gzip body for a plain `.xml` URL without a Content-Encoding header (so the
// runtime fetch layer never gets a chance to auto-decompress it).
export function looksLikeGzipBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1F && bytes[1] === 0x8B
}

export async function decodeSitemapResponseBytes(bytes: Uint8Array): Promise<string> {
  if (!looksLikeGzipBytes(bytes))
    return new TextDecoder('utf-8').decode(bytes)

  // Blob only accepts an ArrayBuffer-backed view, not the wider ArrayBufferLike
  // (e.g. SharedArrayBuffer) that a generic Uint8Array parameter admits.
  const buffer = new Uint8Array(bytes.byteLength)
  buffer.set(bytes)

  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))
  const decompressed = await new Response(stream).arrayBuffer()
  return new TextDecoder('utf-8').decode(decompressed)
}
