import { getRequestHeader, setResponseHeader } from 'h3'
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitro) => {
  let resolvedCalls = 0
  nitro.hooks.hook('sitemap:resolved', (ctx) => {
    if (ctx.sitemapName === 'pages') {
      resolvedCalls++
      setResponseHeader(ctx.event, 'X-Test-Sitemap-Resolved', String(resolvedCalls))
    }
  })

  nitro.hooks.hook('sitemap:output', (ctx) => {
    if (getRequestHeader(ctx.event, 'x-test-buffer-output') === 'true')
      ctx.sitemap = `${ctx.sitemap}\n<!-- output-hook -->`
  })
})
