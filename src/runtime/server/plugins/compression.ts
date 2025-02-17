import { useCompressionStream } from 'h3-compression'
import { defineNitroPlugin } from 'nitropack/runtime'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('beforeResponse', async (event, response) => {
    if (event.context._isSitemap)
      await useCompressionStream(event, response)
  })
})
