import { defineEventHandler } from 'h3'
import type { ResolvedSitemapEntry } from '../../types'
import { useRuntimeConfig, useStorage } from '#imports'

export default defineEventHandler(async () => {
  const sitemapConfig = useRuntimeConfig()['nuxt-simple-sitemap']

  const prefix = 'cache:content:parsed:content'
  // create route from document driven mode
  const parsedKeys = (await useStorage().getKeys(prefix))
    .filter(k => k.endsWith('.md') && !k.includes('/_'))
  const urls: ResolvedSitemapEntry = []
  for (const k of parsedKeys) {
    // get meta from the source
    const meta = await useStorage().getMeta(k.replace(prefix, 'content:source:content'))
    const item = await useStorage().getItem(k)
    // add any top level images
    let images = []
    if (sitemapConfig.discoverImages) {
      images = (item?.parsed.body?.children
        ?.filter(c => ['image', 'img', 'nuxtimg', 'nuxt-img'].includes(c.tag?.toLowerCase()) && c.props?.src)
        .map(i => ({
          loc: i.props.src,
        })) || [])
    }
    const loc = k.replace(prefix, '')
      .replaceAll(':', '/')
      // need to strip out the leading number such as 0.index.md -> index.md
      .replace(/\/\d+\./, '/')
      .split('.')[0]
      .replace('/index', '')
    urls.push({ loc, lastmod: item.parsed?.modifiedAt || meta?.mtime || meta?.ctime, images })
  }
  return urls
})
