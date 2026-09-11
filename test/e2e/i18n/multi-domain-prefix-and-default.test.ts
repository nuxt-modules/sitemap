import { get } from 'node:http'
import { createResolver } from '@nuxt/kit'
import { setup, url } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

await setup({
  rootDir: resolve('../../fixtures/i18n-multi-domain'),
  dev: false,
  nuxtConfig: {
    i18n: {
      strategy: 'prefix_and_default',
      defaultLocale: 'en',
      customRoutes: 'config',
      pages: {
        index: { en: '/', de: '/', it: '/' },
        about: { en: '/about', de: '/ueber', it: '/informazioni' },
      },
    },
  },
})

describe('multi domain default page variants', () => {
  it.each([
    ['english-brand.com', 'en', '/about'],
    ['german-brand.de', 'de', '/ueber'],
  ])('keeps both default variants on %s', async (host, locale, path) => {
    const xml = await new Promise<string>((resolve, reject) => {
      get(url(`/__sitemap__/${locale}-pages.xml`), { headers: { host } }, (response) => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', chunk => body += chunk)
        response.on('end', () => resolve(body))
        response.on('error', reject)
      }).on('error', reject)
    })
    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]!).pathname)
    expect(paths.sort()).toEqual(['/', `/${locale}`, path, `/${locale}${path}`, '/extra', `/${locale}/extra`].sort())
  })
})
