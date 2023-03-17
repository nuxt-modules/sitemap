import { defineEventHandler } from 'h3'
import type { ResolvedSitemapEntry } from '../../types'
import { useStorage } from '#imports'

export default defineEventHandler(async () => {
  const prefix = 'cache:content:parsed:content'
  // create route from document driven mode
  const parsedKeys = (await useStorage().getKeys(prefix))
    .filter(k => k.endsWith('.md') && !k.includes('/_'))
  const urls: ResolvedSitemapEntry = []
  for (const k of parsedKeys) {
    const meta = await useStorage().getMeta(k)
    const item = await useStorage().getItem(k)
    // add any top level images
    const images = item?.parsed.body?.children
      ?.filter(c => c.tag.toLowerCase() === 'image')
      .map(i => ({
        loc: i.props.src,
      })) || []
    const loc = k.replace(prefix, '')
      .replaceAll(':', '/')
      // need to strip out the leading number such as 0.index.md -> index.md
      .replace(/\/\d+\./, '/')
      .split('.')[0]
      .replace('/index', '')
    urls.push({ loc, lastmod: meta?.mtime, images })
  }
  return urls
})
