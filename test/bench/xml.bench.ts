import { bench, describe } from 'vitest'
import { urlsToXml } from '../../src/runtime/server/sitemap/builder/xml'
import type { ResolvedSitemapUrl } from '../../src/runtime/types'

const resolvers = {
  canonicalUrlResolver: (url: string) => `https://example.com${url}`,
  relativeBaseUrlResolver: (url: string) => url,
  fixSlashes: (url: string) => url,
}

const simpleUrls: ResolvedSitemapUrl[] = Array.from({ length: 1000 }, (_, i) => ({
  loc: `https://example.com/page-${i}`,
  lastmod: '2024-01-01',
  changefreq: 'weekly' as const,
  priority: 0.8,
  _key: `page-${i}`,
  _path: null,
}))

const urlsWithImages: ResolvedSitemapUrl[] = Array.from({ length: 1000 }, (_, i) => ({
  loc: `https://example.com/page-${i}`,
  lastmod: '2024-01-01',
  images: [
    { loc: `https://example.com/img-${i}-1.jpg`, title: 'Image 1', caption: 'A caption' },
    { loc: `https://example.com/img-${i}-2.jpg`, title: 'Image 2' },
  ],
  _key: `page-${i}`,
  _path: null,
}))

const urlsWithVideos: ResolvedSitemapUrl[] = Array.from({ length: 500 }, (_, i) => ({
  loc: `https://example.com/video-${i}`,
  videos: [{
    title: `Video ${i}`,
    description: 'A video description',
    thumbnail_loc: `https://example.com/thumb-${i}.jpg`,
    content_loc: `https://example.com/video-${i}.mp4`,
    duration: 300,
    rating: 4.5,
    view_count: 1000,
    family_friendly: true,
    live: false,
    tag: ['tag1', 'tag2'],
  }],
  _key: `video-${i}`,
  _path: null,
}))

const mixedUrls: ResolvedSitemapUrl[] = [
  ...simpleUrls.slice(0, 500),
  ...urlsWithImages.slice(0, 300),
  ...urlsWithVideos.slice(0, 200),
]

const config = { version: '7.0.0', xsl: false, credits: false, minify: false }
const configMinify = { version: '7.0.0', xsl: false, credits: false, minify: true }

describe('xml generation', () => {
  bench('1000 simple urls', () => {
    urlsToXml(simpleUrls, resolvers, config)
  }, { iterations: 100 })

  bench('1000 urls with images', () => {
    urlsToXml(urlsWithImages, resolvers, config)
  }, { iterations: 100 })

  bench('500 urls with videos', () => {
    urlsToXml(urlsWithVideos, resolvers, config)
  }, { iterations: 100 })

  bench('1000 mixed urls', () => {
    urlsToXml(mixedUrls, resolvers, config)
  }, { iterations: 100 })

  bench('1000 simple urls (minified)', () => {
    urlsToXml(simpleUrls, resolvers, configMinify)
  }, { iterations: 100 })

  bench('1000 mixed urls (minified)', () => {
    urlsToXml(mixedUrls, resolvers, configMinify)
  }, { iterations: 100 })
})
