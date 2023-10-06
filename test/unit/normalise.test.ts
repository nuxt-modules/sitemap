import { describe, expect, it } from 'vitest'
import { fixSlashes } from 'site-config-stack'
import { normaliseSitemapData } from '../../src/runtime/sitemap/entries'
import type { BuildSitemapInput } from '../../src/runtime/types'

const normaliseOptions: BuildSitemapInput = {
  // @ts-expect-error test hack
  moduleConfig: { sortEntries: true },
  // @ts-expect-error test hack
  buildTimeMeta: {},
  getRouteRulesForPath: () => ({}),
  canonicalUrlResolver: (path: string) => fixSlashes(true, path),
  nitroUrlResolver: (path: string) => path,
  relativeBaseUrlResolver: (path: string) => path,
  pages: [],
  urls: [],
}
describe('normalise', () => {
  it('query', async () => {
    const normalisedWithoutSlash = await normaliseSitemapData([
      { loc: '/query?foo=bar' },
    ], normaliseOptions)
    expect(normalisedWithoutSlash).toMatchInlineSnapshot(`
      [
        {
          "loc": "/query/?foo=bar",
        },
      ]
    `)
    const normalisedWithSlash = await normaliseSitemapData([
      { loc: '/query/?foo=bar' },
    ], normaliseOptions)
    expect(normalisedWithSlash).toMatchInlineSnapshot(`
      [
        {
          "loc": "/query/?foo=bar",
        },
      ]
    `)
  })
  it('sorting', async () => {
    const data = await normaliseSitemapData([
      { loc: '/a' },
      { loc: '/b' },
      { loc: '/c' },
      { loc: '/1' },
      { loc: '/2' },
      { loc: '/10' },
    ], normaliseOptions)
    expect(data).toMatchInlineSnapshot(`
      [
        {
          "loc": "/1/",
        },
        {
          "loc": "/2/",
        },
        {
          "loc": "/10/",
        },
        {
          "loc": "/a/",
        },
        {
          "loc": "/b/",
        },
        {
          "loc": "/c/",
        },
      ]
    `)
  })
  it('sorting disabled', async () => {
    const data = await normaliseSitemapData([
      { loc: '/b' },
      { loc: '/a' },
      { loc: '/c' },
      { loc: '/1' },
      { loc: '/10' },
      { loc: '/2' },
    ],
      // @ts-expect-error untyped
    { ...normaliseOptions, moduleConfig: { sortEntries: false } } )
    expect(data).toMatchInlineSnapshot(`
      [
        {
          "loc": "/b/",
        },
        {
          "loc": "/a/",
        },
        {
          "loc": "/c/",
        },
        {
          "loc": "/1/",
        },
        {
          "loc": "/10/",
        },
        {
          "loc": "/2/",
        },
      ]
    `)
  })
})
