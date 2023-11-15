import { defu } from 'defu'
import { defineNitroPlugin } from 'nitropack/dist/runtime/plugin'
import type { ParsedContent } from '@nuxt/content/dist/runtime/types'
import type { ModuleRuntimeConfig, SitemapUrl } from '../types'
import { useRuntimeConfig } from '#imports'

export default defineNitroPlugin((nitroApp) => {
  const { discoverImages, isNuxtContentDocumentDriven } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig
  nitroApp.hooks.hook('content:file:afterParse', async (content: ParsedContent) => {
    if (content.sitemap === false || content._extension !== 'md' || content._partial || content.indexable === false || content.index === false)
      return

    // add any top level images
    let images: SitemapUrl['images'] = []
    if (discoverImages) {
      images = (content.body?.children
        ?.filter(c =>
          c.tag && c.props?.src && ['image', 'img', 'nuxtimg', 'nuxt-img'].includes(c.tag.toLowerCase()),
        )
        .map(i => ({ loc: i.props!.src })) || [])
    }

    const sitemapConfig = typeof content.sitemap === 'object' ? content.sitemap : {}
    const lastmod = content.modifiedAt || content.updatedAt
    const defaults: Partial<SitemapUrl> = {}
    if (isNuxtContentDocumentDriven)
      defaults.loc = content._path
    if (content.path) // automatically set when document driven
      defaults.loc = content.path
    if (images.length > 0)
      defaults.images = images
    if (lastmod)
      defaults.lastmod = lastmod
    const definition = defu(sitemapConfig, defaults) as Partial<SitemapUrl>
    if (!definition.loc) {
      // user hasn't provided a loc... lets fallback to a relative path
      if (content.path && content.path && content.path.startsWith('/'))
        definition.loc = content.path
      // otherwise let's warn them
      if (Object.keys(sitemapConfig).length > 0 && import.meta.dev)
        console.warn(`[nuxt-simple-sitemap] The @nuxt/content file \`${content._path}\` is missing a sitemap \`loc\`.`)
    }
    content.sitemap = definition
    // loc is required
    if (!definition.loc)
      delete content.sitemap

    return content
  })
})
