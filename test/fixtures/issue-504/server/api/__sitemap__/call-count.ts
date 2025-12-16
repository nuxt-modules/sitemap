import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  const storage = (globalThis as any).__sitemapTestStorage || {}
  return { count: storage.callCount || 0 }
})
