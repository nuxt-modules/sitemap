import { describe, expect, it } from 'vitest'
import { parseHtmlExtractSitemapMeta } from '../../src/utils/parseHtmlExtractSitemapMeta'

describe('parseHtmlExtractSitemapMeta', () => {
  it('lastmod', async () => {
    // test article meta
    const output = parseHtmlExtractSitemapMeta(`
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
    const output2 = parseHtmlExtractSitemapMeta(`
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
    const testcase1 = parseHtmlExtractSitemapMeta(html1)

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
    const testcase2 = parseHtmlExtractSitemapMeta(html2)

    expect(testcase2).toMatchInlineSnapshot(`
      {
        "images": [
          {
            "loc": "https://res.cloudinary.com/dl6o1xpyq/image/upload/f_jpg,q_auto:best,dpr_auto,w_240,h_240/images/harlan-wilton",
          },
        ],
      }
    `)

    const html3 = `<div id="__nuxt"><div><main><div class="document-driven-page"><!--[--><div><h1 id="index"><!--[-->index<!--]--></h1><ul><!--[--><li><!--[--><a href="/bar" class=""><!--[-->/bar<!--]--></a><!--]--></li><li><!--[--><a href="/foo" class=""><!--[-->/foo<!--]--></a><!--]--></li><!--]--></ul><img onerror="this.setAttribute(&#39;data-error&#39;, 1)" alt="Test image" data-nuxt-img srcset="/_ipx/_/logo.svg 1x, /_ipx/_/logo.svg 2x" src="/_ipx/_/logo.svg" class="test"><p><!--[--><a href="/sitemap.xml" class=""><!--[-->/sitemap.xml<!--]--></a><!--]--></p></div><!--]--></div></main></div></div><div id="teleports"></div>`
    const testcase3 = parseHtmlExtractSitemapMeta(html3)
    expect(testcase3).toMatchInlineSnapshot(`
      {
        "images": [
          {
            "loc": "/_ipx/_/logo.svg",
          },
        ],
      }
    `)
  })

  it('video: ignores invalid markup', async () => {
    const mainTag = '<main>'
    const mainClosingTag = '</main>'
    const discoverableVideoSrcHTML = `
      <video
        controls
        src="https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"
        width="620"
      >
        Sorry, your browser doesn't support embedded videos, but don't worry, you
        can
        <a href="https://archive.org/details/BigBuckBunny_124">download it</a>
        and watch it with your favorite video player!
      </video>
    `

    // Test case 1 - Single discoverable video src element
    const html1 = `${mainTag}${discoverableVideoSrcHTML}${mainClosingTag}`
    const testcase1 = parseHtmlExtractSitemapMeta(html1)

    expect(testcase1).toMatchInlineSnapshot(`{}`)
  })

  it('video: simple valid markup', async () => {
    const mainTag = '<main>'
    const mainClosingTag = '</main>'

    const discoverableVideoWithPosterSrcHTML = `
      <video
        controls
        src="https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"
        poster="https://archive.org/download/BigBuckBunny_124/__ia_thumb.jpg"
        width="620"
        data-title="Big Buck Bunny"
        data-description="Big Buck Bunny in DivX 720p."
      >
        Sorry, your browser doesn't support embedded videos, but don't worry, you
        can
        <a href="https://archive.org/details/BigBuckBunny_124">download it</a>
        and watch it with your favorite video player!
      </video>
    `
    // Test case 2 - Single discoverable video src element with poster
    const html2 = `${mainTag}${discoverableVideoWithPosterSrcHTML}${mainClosingTag}`
    const testcase2 = parseHtmlExtractSitemapMeta(html2)

    expect(testcase2).toMatchInlineSnapshot(`
      {
        "videos": [
          {
            "content_loc": "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
            "description": "Big Buck Bunny in DivX 720p.",
            "thumbnail_loc": "https://archive.org/download/BigBuckBunny_124/__ia_thumb.jpg",
            "title": "Big Buck Bunny",
          },
        ],
      }
    `)
  })

  it('extracts videos from HTML #3', async () => {
    const mainTag = '<main>'
    const mainClosingTag = '</main>'

    const discoverableVideoSourcesHTML = `
      <video
        controls
        width="620"
      >
        <source
          src="https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda_512kb.mp4"
          type="video/mp4"
        />
        <source
          src="https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda.avi"
          type="video/x-msvideo"
        />
        Sorry, your browser doesn't support embedded videos, but don't worry, you
        can
        <a href="https://archive.org/details/DuckAndCover_185">download it</a>
        and watch it with your favorite video player!
      </video>
    `

    // Test case 3 - Multiple discoverable video sources
    const html3 = `${mainTag}${discoverableVideoSourcesHTML}${mainClosingTag}`
    const testcase3 = parseHtmlExtractSitemapMeta(html3)

    expect(testcase3).toMatchInlineSnapshot(`{}`)
  })

  it('extracts videos from HTML #4', async () => {
    const mainTag = '<main>'
    const mainClosingTag = '</main>'

    const discoverableVideoSourcesWithPosterHTML = `
      <video
        controls
        poster="https://archive.org/download/DuckAndCover_185/__ia_thumb.jpg"
        width="620"
        data-title="Duck and Cover"
        data-description="This film, a combination of animated cartoon and live action, shows young children what to do in case of an atomic attack."
      >
        <source
          src="https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda_512kb.mp4"
          type="video/mp4"
        />
        <source
          src="https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda.avi"
          type="video/x-msvideo"
        />
        Sorry, your browser doesn't support embedded videos, but don't worry, you
        can
        <a href="https://archive.org/details/DuckAndCover_185">download it</a>
        and watch it with your favorite video player!
      </video>
    `

    // Test case 4 - Multiple discoverable video sources
    const html4 = `${mainTag}${discoverableVideoSourcesWithPosterHTML}${mainClosingTag}`
    const testcase4 = parseHtmlExtractSitemapMeta(html4)

    expect(testcase4).toMatchInlineSnapshot(`
      {
        "videos": [
          {
            "content_loc": "https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda_512kb.mp4",
            "description": "This film, a combination of animated cartoon and live action, shows young children what to do in case of an atomic attack.",
            "thumbnail_loc": "https://archive.org/download/DuckAndCover_185/__ia_thumb.jpg",
            "title": "Duck and Cover",
          },
          {
            "content_loc": "https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda.avi",
            "description": "This film, a combination of animated cartoon and live action, shows young children what to do in case of an atomic attack.",
            "thumbnail_loc": "https://archive.org/download/DuckAndCover_185/__ia_thumb.jpg",
            "title": "Duck and Cover",
          },
        ],
      }
    `)
  })

  it('extracts videos from HTML #5', async () => {
    const mainTag = '<main>'
    const mainClosingTag = '</main>'

    const discoverableVideoWithPosterSrcHTML = `
      <video
        controls
        src="https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"
        poster="https://archive.org/download/BigBuckBunny_124/__ia_thumb.jpg"
        width="620"
        data-title="Big Buck Bunny"
        data-description="Big Buck Bunny in DivX 720p."
      >
        Sorry, your browser doesn't support embedded videos, but don't worry, you
        can
        <a href="https://archive.org/details/BigBuckBunny_124">download it</a>
        and watch it with your favorite video player!
      </video>
    `
    const discoverableVideoSourcesWithPosterHTML = `
      <video
        controls
        poster="https://archive.org/download/DuckAndCover_185/__ia_thumb.jpg"
        width="620"
        data-title="Duck and Cover"
        data-description="This film, a combination of animated cartoon and live action, shows young children what to do in case of an atomic attack."
      >
        <source
          src="https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda_512kb.mp4"
          type="video/mp4"
        />
        <source
          src="https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda.avi"
          type="video/x-msvideo"
        />
        Sorry, your browser doesn't support embedded videos, but don't worry, you
        can
        <a href="https://archive.org/details/DuckAndCover_185">download it</a>
        and watch it with your favorite video player!
      </video>
    `

    // Test case 4 - Mixture of single video src and multiple discoverable video sources
    const html5 = `${mainTag}${discoverableVideoWithPosterSrcHTML}${discoverableVideoSourcesWithPosterHTML}${mainClosingTag}`
    const testcase5 = parseHtmlExtractSitemapMeta(html5)

    expect(testcase5).toMatchInlineSnapshot(`
      {
        "videos": [
          {
            "content_loc": "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
            "description": "Big Buck Bunny in DivX 720p.",
            "thumbnail_loc": "https://archive.org/download/BigBuckBunny_124/__ia_thumb.jpg",
            "title": "Big Buck Bunny",
          },
          {
            "content_loc": "https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda_512kb.mp4",
            "description": "This film, a combination of animated cartoon and live action, shows young children what to do in case of an atomic attack.",
            "thumbnail_loc": "https://archive.org/download/DuckAndCover_185/__ia_thumb.jpg",
            "title": "Duck and Cover",
          },
          {
            "content_loc": "https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda.avi",
            "description": "This film, a combination of animated cartoon and live action, shows young children what to do in case of an atomic attack.",
            "thumbnail_loc": "https://archive.org/download/DuckAndCover_185/__ia_thumb.jpg",
            "title": "Duck and Cover",
          },
        ],
      }
    `)
  })
  it('extracts relative poster as absolute', async () => {
    const testcase5 = parseHtmlExtractSitemapMeta(`
<main>
      <video
        controls
        src="https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4"
        poster="/poster.jpg"
        width="620"
        data-title="Big Buck Bunny"
        data-description="Big Buck Bunny in DivX 720p."
      >
              <source
          src="https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda_512kb.mp4"
          type="video/mp4"
        />
        </video>
        </main>
       `, {
      videos: true,
      resolveUrl(s) {
        return s.startsWith('/') ? `https://example.com${s}` : s
      },
    })
    expect(testcase5).toMatchInlineSnapshot(`
      {
        "videos": [
          {
            "content_loc": "https://archive.org/download/DuckAndCover_185/CivilDefenseFilm-DuckAndCoverColdWarNuclearPropaganda_512kb.mp4",
            "description": "Big Buck Bunny in DivX 720p.",
            "thumbnail_loc": "https://example.com/poster.jpg",
            "title": "Big Buck Bunny",
          },
        ],
      }
    `)
  })

  it('blocks pages with noindex meta tag', async () => {
    const noindex = parseHtmlExtractSitemapMeta(`
      <head>
        <meta name="robots" content="noindex">
      </head>
    `)
    expect(noindex).toBe(null)

    const noindexFollow = parseHtmlExtractSitemapMeta(`
      <head>
        <meta name="robots" content="noindex, follow">
      </head>
    `)
    expect(noindexFollow).toBe(null)

    const none = parseHtmlExtractSitemapMeta(`
      <head>
        <meta name="robots" content="none">
      </head>
    `)
    expect(none).toBe(null)
  })
})
