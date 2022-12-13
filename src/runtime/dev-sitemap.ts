import { defineEventHandler } from '#imports'
export default defineEventHandler(async () => {
  return 'Sitemap is not available in development mode.<br><br>If you\'d like to view it run <code>nuxi generate</code> or <code>nuxi build</code>.'
})
