import { defineEventHandler } from 'h3'
export default defineEventHandler(async () => {
  return 'Only a preview of the sitemap is only available in development. It may be missing dynamic URLs and URLs added with the `sitemap:generate` hook.<br><br>You can preview it at <a href="/sitemap.preview.xml">/sitemap.preview.xml</a><br><br>If you\'d like to view the real sitemap run <code>nuxi generate</code> or <code>nuxi build</code>.'
})
