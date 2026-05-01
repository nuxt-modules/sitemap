import { defineNitroPlugin } from 'nitropack/runtime'
import { joinURL, withLeadingSlash } from 'ufo'
import { useSitemapRuntimeConfig } from '../utils'

export default defineNitroPlugin((nitroApp) => {
  const { sitemaps, sitemapsPathPrefix } = useSitemapRuntimeConfig()
  const queue: (() => Promise<Response>)[] = []
  const timeoutIds: NodeJS.Timeout[] = []

  const enqueue = (path: string) => {
    queue.push(() => nitroApp.localFetch(withLeadingSlash(path), {}))
  }

  for (const [name, sitemap] of Object.entries(sitemaps)) {
    if (!sitemap._route)
      continue
    if (name === 'index') {
      enqueue(sitemap._route)
      continue
    }
    // Chunked sitemaps don't expose the base route — the catch-all serves a non-chunked variant
    // that bypasses chunk slicing. Warm chunk-0 instead so the shared resolved-URLs cache is
    // populated with the correct filter pass; sibling chunk requests then hit that cache.
    const def = sitemap as { chunks?: unknown, _isChunking?: boolean, _route: string }
    if (def.chunks || def._isChunking) {
      enqueue(joinURL(sitemapsPathPrefix || '/', `${name}-0.xml`))
    }
    else {
      enqueue(sitemap._route)
    }
  }

  // run async
  const initialTimeout = setTimeout(() => {
    // work the queue step by step await the promise from each task, delay 1s after each task ends
    const next = async () => {
      if (queue.length === 0) {
        // Clear timeout references when done
        timeoutIds.length = 0
        return
      }

      try {
        await queue.shift()!()
      }
      catch (error) {
        console.error('[sitemap:warm-up] Error warming up sitemap:', error)
      }

      // Only schedule next if we have more items
      if (queue.length > 0) {
        const nextTimeout = setTimeout(next, 1000) // arbitrary delay to avoid throttling
        timeoutIds.push(nextTimeout)
      }
    }
    next()
  }, 2500 /* https://github.com/unjs/nitro/pull/1906 */)

  timeoutIds.push(initialTimeout)

  // Clean up on app shutdown
  nitroApp.hooks.hook('close', () => {
    // Clear all pending timeouts
    timeoutIds.forEach(id => clearTimeout(id))
    timeoutIds.length = 0
    queue.length = 0
  })
})
