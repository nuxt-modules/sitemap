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

  it('extracts images from HTML', async () => {
    const mainTag = '<main>'
    const mainClosingTag = '</main>'
    const discoverableImageHTML = `
      <img
        src="https://res.cloudinary.com/dl6o1xpyq/image/upload/f_jpg,q_auto:best,dpr_auto,w_240,h_240/images/harlan-wilton"
        alt="Harlan Wilton"
      />
    `
    const excludeImageDataHTML = `
      <img
        src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
      />
    `
    
    const excludeImageBlobHTML = `
      <img
        src="blob:http://example.com/12345678-1234-5678-1234-567812345678"
      />
    `
    const excludeImageFileHTML = `
      <img
        src="file:///C:/path/to/image.jpg"
      />
    `

    // Test case 1 - Single discoverable image
    const html1 = `${mainTag}${discoverableImageHTML}${mainClosingTag}`
    const testcase1 = extractSitemapMetaFromHtml(html1)

    expect(testcase1).toMatchInlineSnapshot(`
      {
        "images": [
          {
            "loc": "https://res.cloudinary.com/dl6o1xpyq/image/upload/f_jpg,q_auto:best,dpr_auto,w_240,h_240/images/harlan-wilton",
          },
        ],
      }
    `)

    // Test case 2 - Single discoverable image with excluded image values
    const html2 = `${mainTag}${discoverableImageHTML}${excludeImageDataHTML}${excludeImageBlobHTML}${excludeImageFileHTML}${mainClosingTag}`
    const testcase2 = extractSitemapMetaFromHtml(html2)

    expect(testcase2).toMatchInlineSnapshot(`
      {
        "images": [
          {
            "loc": "https://res.cloudinary.com/dl6o1xpyq/image/upload/f_jpg,q_auto:best,dpr_auto,w_240,h_240/images/harlan-wilton",
          },
        ],
      }
    `)
  })
})
