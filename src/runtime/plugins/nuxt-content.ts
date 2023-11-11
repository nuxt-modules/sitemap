import type { NitroAppPlugin } from 'nitropack'
import { prefixStorage } from 'unstorage'
import { defu } from 'defu'
import type { ModuleRuntimeConfig, SitemapUrl } from '../types'
import { useRuntimeConfig, useStorage } from '#imports'

export const NuxtContentSimpleSitemapPlugin: NitroAppPlugin = (nitroApp) => {
  const { discoverImages, autoLastmod } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig
  const contentStorage = prefixStorage(useStorage(), 'content:source')
  nitroApp.hooks.hook('content:file:afterParse', async (content) => {
    if (content._extension !== 'md' || content._partial || content.sitemap === false || content.indexable === false)
      return
    // add any top level images
    let images = []
    if (discoverImages) {
      images = (content.body?.children
        ?.filter(c => ['image', 'img', 'nuxtimg', 'nuxt-img'].includes(c.tag?.toLowerCase()) && c.props?.src)
        .map(i => ({
          loc: i.props.src,
        })) || [])
    }

    let lastmod
    if (autoLastmod) {
      const meta = await contentStorage.getMeta(content._id)
      lastmod = content.modifiedAt || meta?.mtime
    }
    const defaults: Partial<SitemapUrl> = { loc: content._path, images }
    if (lastmod)
      defaults.lastmod = lastmod
    content.sitemap = defu(content.sitemap, defaults)
    return content
  })
}

export default NuxtContentSimpleSitemapPlugin
