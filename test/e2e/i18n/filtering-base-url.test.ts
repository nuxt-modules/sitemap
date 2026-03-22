import { createResolver } from '@nuxt/kit'
import { $fetch, setup } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n'),
  nuxtConfig: {
    app: {
      baseURL: '/base',
    },
    sitemap: {
      exclude: [
        '/test',
      ],
    },
  },
})

describe('i18n filtering with base url', () => {
  it('excludes /test', async () => {
    let sitemap = await $fetch('/base/__sitemap__/en-US.xml')

    // strip lastmod
    sitemap = sitemap.replace(/<lastmod>.*<\/lastmod>/g, '')

    expect(sitemap).not.toContain('/base/en/test')
    expect(sitemap).not.toContain('/base/test')
  }, 60000)
})
