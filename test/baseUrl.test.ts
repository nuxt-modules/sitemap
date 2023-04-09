import { describe, expect, it } from 'vitest'
import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../.playground'),
  build: true,
  server: true,
  nuxtConfig: {
    app: {
      baseURL: '/base',
    },
    sitemap: {
      autoLastmod: false,
      siteUrl: 'https://nuxt-simple-sitemap.com',
    },
  },
})
describe('base', () => {
  it('basic', async () => {
    const sitemapIndex = await $fetch('/base/sitemap_index.xml')

    // test that we have 2 sitemap entries using regex
    expect(sitemapIndex.match(/<sitemap>/g)!.length).toBe(2)

    expect(sitemapIndex).not.match(/\/base\/base\//g)

    const posts = await $fetch('/base/posts-sitemap.xml')

    // expect(posts).not.match(/\/base\/base\//g)
    expect(posts).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/base/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/tags</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/tags\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-1</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-1\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-2</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-2\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-3</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-3\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-4</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-4\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-5</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-5\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-6</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-6\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-7</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-7\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-8</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-8\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-9</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-9\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-10</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-10\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-11</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-11\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-12</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-12\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-13</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-13\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-14</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-14\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-15</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-15\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-16</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-16\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-17</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-17\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-18</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-18\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-19</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-19\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-20</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-20\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-21</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-21\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-22</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-22\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-23</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-23\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-24</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-24\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-25</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-25\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-26</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-26\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-27</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-27\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-28</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-28\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-29</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-29\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-30</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-30\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-31</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-31\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-32</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-32\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-33</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-33\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-34</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-34\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-35</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-35\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-36</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-36\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-37</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-37\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-38</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-38\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-39</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-39\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-40</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-40\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-41</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-41\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-42</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-42\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-43</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-43\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-44</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-44\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-45</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-45\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-46</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-46\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-47</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-47\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-48</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-48\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-49</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-49\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/post-50</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/post-50\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/blog/categories</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/blog/categories\\" />
          </url>
      </urlset>
      <!-- XML Sitemap generated by Nuxt Simple Sitemap -->"
    `)

    expect(await $fetch('/base/pages-sitemap.xml')).toMatchInlineSnapshot(`
      "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?><?xml-stylesheet type=\\"text/xsl\\" href=\\"/base/__sitemap__/style.xsl\\"?>
      <urlset xmlns:xsi=\\"http://www.w3.org/2001/XMLSchema-instance\\" xmlns:xhtml=\\"http://www.w3.org/1999/xhtml\\" xmlns:image=\\"http://www.google.com/schemas/sitemap-image/1.1\\" xsi:schemaLocation=\\"http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd\\" xmlns=\\"http://www.sitemaps.org/schemas/sitemap/0.9\\">
          <url>
              <loc>https://nuxt-simple-sitemap.com/base</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/bar</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/bar\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/foo</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/foo\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/about</loc>
              <lastmod>2023-02-21T08:50:52+00:00</lastmod>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/about\\" />
              <image:image>
                  <image:loc>https://example.com/image-3.jpg</image:loc>
              </image:image>
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/secret</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/secret\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/new-page</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/new-page\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/users-lazy/1</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/users-lazy/1\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/users-lazy/2</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/users-lazy/2\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/users-lazy/3</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/users-lazy/3\\" />
          </url>
          <url>
              <loc>https://nuxt-simple-sitemap.com/base/hidden-path-but-in-sitemap</loc>
              <xhtml:link rel=\\"alternate\\" hreflang=\\"fr\\" href=\\"https://nuxt-simple-sitemap.com/base/fr/hidden-path-but-in-sitemap\\" />
          </url>
      </urlset>
      <!-- XML Sitemap generated by Nuxt Simple Sitemap -->"
    `)
  }, 60000)
})
