import type { NitroAppPlugin } from 'nitropack'
import { prefixStorage } from 'unstorage'
import { useRuntimeConfig, useStorage } from '#imports'

const contentStorage = prefixStorage(useStorage(), 'content:source')

export const NuxtContentSimpleSitemapPlugin: NitroAppPlugin = (nitroApp) => {
  const sitemapConfig = useRuntimeConfig()['nuxt-simple-sitemap']
  nitroApp.hooks.hook('content:file:afterParse', async (content) => {
    if (content._extension !== 'md')
      return
    // add any top level images
    let images = []
    if (sitemapConfig?.discoverImages) {
      images = (content.body?.children
        ?.filter(c => ['image', 'img', 'nuxtimg', 'nuxt-img'].includes(c.tag?.toLowerCase()) && c.props?.src)
        .map(i => ({
          loc: i.props.src,
        })) || [])
    }

    let lastmod
    if (sitemapConfig?.autoLastmod) {
      const meta = await contentStorage.getMeta(content._id)
      lastmod = content.modifiedAt || meta?.mtime
    }
    content._sitemap = { loc: content._path, lastmod, images }
    return content
  })
}

export default NuxtContentSimpleSitemapPlugin
