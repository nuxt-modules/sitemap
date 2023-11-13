import { describe, expect, it } from 'vitest'
import { extractSitemapMetaFromHtml } from '../../src/util/extractSitemapMetaFromHtml'

describe('extractSitemapMetaFromHtml', () => {
  it('lastmod', async () => {
    // test article meta
    const output = extractSitemapMetaFromHtml(`
    <head>
      <meta property="article:published_time" content="2021-04-01T00:00:00Z">
      <meta property="article:modified_time" content="2021-04-02T00:00:00Z">
    </head>
`)
    expect(output).toMatchInlineSnapshot(`
      {
        "lastmod": "2021-04-02T00:00:00Z",
      }
    `)
    // test article meta
    const output2 = extractSitemapMetaFromHtml(`
    <head>
      <meta content="2021-04-01T00:00:00Z" property="article:published_time"/>
      <meta content="2021-04-02T00:00:00Z" property="article:modified_time"/>
    </head>
`)
    expect(output2).toMatchInlineSnapshot(`
      {
        "lastmod": "2021-04-02T00:00:00Z",
      }
    `)
  })
})
