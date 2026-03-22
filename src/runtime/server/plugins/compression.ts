import type { H3Event } from 'h3'
import { getRequestHeader, setResponseHeader } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'

function getPreferredEncoding(event: H3Event): 'gzip' | 'deflate' | null {
  const acceptEncoding = getRequestHeader(event, 'accept-encoding') || ''
  if (acceptEncoding.includes('gzip'))
    return 'gzip'
  if (acceptEncoding.includes('deflate'))
    return 'deflate'
  return null
}

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('beforeResponse', async (event, response) => {
    if (!event.context._isSitemap || !response.body)
      return

    const encoding = getPreferredEncoding(event)
    if (!encoding)
      return

    const body = typeof response.body === 'string' ? response.body : JSON.stringify(response.body)
    const stream = new Blob([body]).stream().pipeThrough(new CompressionStream(encoding))
    response.body = Buffer.from(await new Response(stream).arrayBuffer())
    setResponseHeader(event, 'Content-Encoding', encoding)
  })
})
