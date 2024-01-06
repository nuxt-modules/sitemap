import { describe, expect, it } from 'vitest'
import { fixSlashes } from 'site-config-stack/urls'
import type { NitroUrlResolvers } from '../../src/runtime/types'
import { normaliseSitemapUrls } from '../../src/runtime/nitro/sitemap/urlset/normalise'

const resolvers = {
  fixSlashes: (path: string) => fixSlashes(true, path),
  canonicalUrlResolver: (path: string) => fixSlashes(true, path),
  relativeBaseUrlResolver: (path: string) => path,
} as NitroUrlResolvers

describe('normalise', () => {
  it('query', async () => {
    const normalisedWithoutSlash = await normaliseSitemapUrls([
      { loc: '/query?foo=bar' },
    ], resolvers)
    expect(normalisedWithoutSlash).toMatchInlineSnapshot(`
      [
        {
          "_key": "/query/?foo=bar",
          "loc": "/query/?foo=bar",
        },
      ]
    `)
    const normalisedWithSlash = await normaliseSitemapUrls([
      { loc: '/query/?foo=bar' },
    ], resolvers)
    expect(normalisedWithSlash).toMatchInlineSnapshot(`
      [
        {
          "_key": "/query/?foo=bar",
          "loc": "/query/?foo=bar",
        },
      ]
    `)
  })
  it('sorting', async () => {
    const data = await normaliseSitemapUrls([
      { loc: '/a' },
      { loc: '/b' },
      { loc: '/c' },
      { loc: '/1' },
      { loc: '/2' },
      { loc: '/10' },
    ], resolvers)
    expect(data).toMatchInlineSnapshot(`
      [
        {
          "_key": "/a/",
          "loc": "/a/",
        },
        {
          "_key": "/b/",
          "loc": "/b/",
        },
        {
          "_key": "/c/",
          "loc": "/c/",
        },
        {
          "_key": "/1/",
          "loc": "/1/",
        },
        {
          "_key": "/2/",
          "loc": "/2/",
        },
        {
          "_key": "/10/",
          "loc": "/10/",
        },
      ]
    `)
  })
  it('sorting disabled', async () => {
    const data = await normaliseSitemapUrls([
      { loc: '/b' },
      { loc: '/a' },
      { loc: '/c' },
      { loc: '/1' },
      { loc: '/10' },
      { loc: '/2' },
    ], resolvers)
    expect(data).toMatchInlineSnapshot(`
      [
        {
          "_key": "/b/",
          "loc": "/b/",
        },
        {
          "_key": "/a/",
          "loc": "/a/",
        },
        {
          "_key": "/c/",
          "loc": "/c/",
        },
        {
          "_key": "/1/",
          "loc": "/1/",
        },
        {
          "_key": "/10/",
          "loc": "/10/",
        },
        {
          "_key": "/2/",
          "loc": "/2/",
        },
      ]
    `)
  })
})
