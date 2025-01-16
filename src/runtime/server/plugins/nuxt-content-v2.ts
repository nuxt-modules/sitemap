import { defu } from 'defu'
import type { ParsedContent } from '@nuxt/content'
import type { NitroApp } from 'nitropack/types'
import type { SitemapUrl } from '../../types'
import { useSimpleSitemapRuntimeConfig } from '../utils'
import { defineNitroPlugin } from '#imports'

export default defineNitroPlugin((nitroApp: NitroApp) => {
  const { discoverImages, discoverVideos, isNuxtContentDocumentDriven } = useSimpleSitemapRuntimeConfig()
  // @ts-expect-error untyped
  nitroApp.hooks.hook('content:file:afterParse', async (content: ParsedContent) => {
    const validExtensions = ['md', 'mdx']
    if (content.sitemap === false || content._draft || !validExtensions.includes(content._extension) || content._partial || content.robots === false)
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

    // add any top level videos
    let videos: SitemapUrl['videos'] = []
    if (discoverVideos) {
      videos = (content.body?.children
        ?.filter(c =>
          c.tag && c.props?.src && ['video'].includes(c.tag.toLowerCase()),
        )
        .map(i => ({ content_loc: i.props!.src })) || [])
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
    if (videos.length > 0)
      defaults.videos = videos
    if (lastmod)
      defaults.lastmod = lastmod
    const definition = defu(sitemapConfig, defaults) as Partial<SitemapUrl>
    if (!definition.loc) {
      // user hasn't provided a loc... lets fallback to a relative path
      if (content.path && content.path && content.path.startsWith('/'))
        definition.loc = content.path
      // otherwise let's warn them
      if (Object.keys(sitemapConfig).length > 0 && import.meta.dev)
        console.warn(`[@nuxtjs/content] The @nuxt/content file \`${content._path}\` is missing a sitemap \`loc\`.`)
    }
    content.sitemap = definition
    // loc is required
    if (!definition.loc)
      delete content.sitemap

    return content
  })
})
