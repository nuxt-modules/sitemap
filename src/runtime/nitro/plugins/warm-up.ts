import { defineNitroPlugin } from 'nitropack/dist/runtime/plugin'
import { withLeadingSlash } from 'ufo'
import { useSimpleSitemapRuntimeConfig } from '../../utils'

export default defineNitroPlugin((nitroApp) => {
  const { sitemaps } = useSimpleSitemapRuntimeConfig()
  const queue: (() => Promise<Response>)[] = []
  const sitemapsWithRoutes = Object.entries(sitemaps)
    .filter(([, sitemap]) => sitemap._route)
  for (const [, sitemap] of sitemapsWithRoutes)
    queue.push(() => nitroApp.localFetch(withLeadingSlash(sitemap._route), {}))

  // run async
  setTimeout(() => {
    // work the queue step by step await the promise from each task, delay 1s after each task ends
    const next = async () => {
      if (queue.length === 0)
        return
      await queue.shift()!()
      setTimeout(next, 1000) // arbitrary delay to avoid throttling
    }
    next()
  }, 2500 /* https://github.com/unjs/nitro/pull/1906 */)
})
