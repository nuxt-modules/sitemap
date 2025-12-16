import { defu } from 'defu'
import type { NitroApp } from 'nitropack/types'
import { defineNitroPlugin } from 'nitropack/runtime'
import type { SitemapUrl } from '../../types'
import { useSitemapRuntimeConfig } from '../utils'

interface NuxtContentDocument {
  sitemap?: Partial<SitemapUrl> | boolean
  _draft?: boolean
  _extension?: string
  _partial?: boolean
  _path?: string
  path?: string
  robots?: boolean
  body?: {
    children?: Array<{ tag?: string, props?: { src?: string } }>
  }
  modifiedAt?: string | Date
  updatedAt?: string | Date
}

export default defineNitroPlugin((nitroApp: NitroApp) => {
  const { discoverImages, isNuxtContentDocumentDriven } = useSitemapRuntimeConfig()
  // @ts-expect-error untyped hook
  nitroApp.hooks.hook('content:file:afterParse', async (content: NuxtContentDocument) => {
    const validExtensions = ['md', 'mdx']
    if (content.sitemap === false || content._draft || !validExtensions.includes(content._extension || '') || content._partial || content.robots === false)
      return

    // add any top level images
    let images: SitemapUrl['images'] = []
    if (discoverImages) {
      const children = content.body?.children || []
      images = children
        .filter(c => c.tag && c.props?.src && ['image', 'img', 'nuxtimg', 'nuxt-img'].includes(c.tag.toLowerCase()))
        .map(i => ({ loc: i.props!.src! }))
    }

    const sitemapConfig: Partial<SitemapUrl> = typeof content.sitemap === 'object' ? content.sitemap : {}
    const lastmod = content.modifiedAt || content.updatedAt
    const defaults: Partial<SitemapUrl> = {}
    if (isNuxtContentDocumentDriven && typeof content._path === 'string')
      defaults.loc = content._path
    if (typeof content.path === 'string') // automatically set when document driven
      defaults.loc = content.path
    if (images?.length)
      defaults.images = images
    if (typeof lastmod === 'string' || lastmod instanceof Date)
      defaults.lastmod = lastmod
    const definition = defu(sitemapConfig, defaults) as Partial<SitemapUrl>
    if (!definition.loc) {
      // user hasn't provided a loc... lets fallback to a relative path
      if (typeof content.path === 'string' && content.path.startsWith('/'))
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
