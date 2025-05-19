import { withLeadingSlash } from 'ufo'
import { defineNitroPlugin } from 'nitropack/runtime'
import { useSitemapRuntimeConfig } from '../utils'

export default defineNitroPlugin((nitroApp) => {
  const { sitemaps } = useSitemapRuntimeConfig()
  const queue: (() => Promise<Response>)[] = []
  const timeoutIds: NodeJS.Timeout[] = []

  const sitemapsWithRoutes = Object.entries(sitemaps)
    .filter(([, sitemap]) => sitemap._route)

  for (const [, sitemap] of sitemapsWithRoutes)
    queue.push(() => nitroApp.localFetch(withLeadingSlash(sitemap._route), {}))

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
