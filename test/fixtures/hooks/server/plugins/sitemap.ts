import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:input', async (ctx) => {
    ctx.urls.push({
      loc: '/test-1',
    })

    ctx.urls.push({
      loc: '/test-2',
    })
  })
})
