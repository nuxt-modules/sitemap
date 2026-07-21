import { removeResponseHeader } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'
import { logger } from '../../utils-pure'
import { createNodeResponseStream, isReadableStream } from '../sitemap/stream'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('beforeResponse', (event, response) => {
    const nodeResponse = event.node.res
    if (!event.context._isSitemap
      || !isReadableStream(response.body)
      // Fetch/edge adapters use a socket-less response shim and can consume the
      // Web stream directly. Only H3's live Node transport needs this adapter.
      || !nodeResponse?.socket
      || typeof nodeResponse?.write !== 'function'
      || typeof nodeResponse?.once !== 'function') {
      return
    }

    response.body = createNodeResponseStream(response.body, (error) => {
      logger.error('Failed to cancel sitemap response stream after the client disconnected.', error)
    })
    removeResponseHeader(event, 'Content-Length')
  })
})
