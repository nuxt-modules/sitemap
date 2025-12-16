import { defineEventHandler, getRouterParam } from 'h3'

// Track call count at module level
let callCount = 0

export default defineEventHandler((event) => {
  const category = getRouterParam(event, 's_type')
  callCount++
  // eslint-disable-next-line no-console
  console.log(`sitemap: ${category} (call ${callCount})`)

  // Store count in app context for test retrieval
  const storage = (globalThis as any).__sitemapTestStorage = (globalThis as any).__sitemapTestStorage || {}
  storage.callCount = callCount

  return [
    { loc: '/dynamic-page-1' },
    { loc: '/dynamic-page-2' },
  ]
})
