import { defineEventHandler } from 'h3'
import { joinURL } from 'ufo'
import { baseURL } from '#paths'

export default defineEventHandler(async () => {
  const url = joinURL(baseURL(), '/sitemap.preview.xml')
  return `Only a preview of the sitemap is only available in development. It may be missing dynamic URLs and URLs added with the <code>sitemap:generate</code> hook.<br><br>You can preview it at <a href="${url}">/sitemap.preview.xml</a><br><br>If you\'d like to view the real sitemap run <code>nuxi generate</code> or <code>nuxi build</code>.`
})
