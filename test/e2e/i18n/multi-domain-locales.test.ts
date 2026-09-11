import { get } from 'node:http'
import { createResolver } from '@nuxt/kit'
import { setup, url } from '@nuxt/test-utils'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)
const locales = ['en', 'de', 'it']
const domains = ['english-brand.com', 'german-brand.de', 'italian-brand.it']

await setup({
  rootDir: resolve('../../fixtures/i18n-multi-domain'),
  dev: false,
})

describe('multi domain locales', () => {
  it.each(domains.flatMap(host => [{ host, forwarded: false }, { host, forwarded: true }]))('uses $host with forwarded=$forwarded without sharing cached URLs', async ({ host, forwarded }) => {
    const defaultLocale = locales[domains.indexOf(host)]
    for (const locale of locales) {
      const xml = await new Promise<string>((resolve, reject) => {
        get(url(`/__sitemap__/${locale}-pages.xml`), { headers: forwarded ? { 'host': 'proxy.internal', 'x-forwarded-host': host } : { host } }, (response) => {
          let body = ''
          response.setEncoding('utf8')
          response.on('data', chunk => body += chunk)
          response.on('end', () => resolve(body))
          response.on('error', reject)
        }).on('error', reject)
      })
      const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]!).pathname)
      const prefix = locale === defaultLocale ? '' : `/${locale}`
      expect(paths.sort()).toEqual([prefix || '/', `${prefix}/about`, `${prefix}/extra`, ...(locale === defaultLocale ? ['/privacy'] : [])].sort())
      for (const match of xml.matchAll(/<url>([\s\S]+?)<\/url>/g)) {
        const loc = new URL(/<loc>([^<]+)<\/loc>/.exec(match[1]!)![1]!)
        expect(loc.host).toBe(host)
        const basePath = prefix ? loc.pathname.slice(prefix.length) || '/' : loc.pathname
        const alternatives = [...match[1]!.matchAll(/<xhtml:link ([^>]+)\/>/g)].map((link) => {
          const hreflang = /hreflang="([^"]+)"/.exec(link[1]!)![1]!
          const href = /href="([^"]+)"/.exec(link[1]!)![1]!
          return { hreflang, href }
        })
        const expected = (basePath === '/privacy' ? [defaultLocale!, 'x-default'] : [...locales, 'x-default']).map((hreflang) => {
          const alternateLocale = hreflang === 'x-default' ? defaultLocale : hreflang
          const alternatePrefix = alternateLocale === defaultLocale ? '' : `/${alternateLocale}`
          const path = alternatePrefix ? `${alternatePrefix}${basePath === '/' ? '' : basePath}` : basePath
          return { hreflang, href: `https://${host}${path}` }
        })
        expect(alternatives.sort((a, b) => a.hreflang.localeCompare(b.hreflang))).toEqual(expected.sort((a, b) => a.hreflang.localeCompare(b.hreflang)))
      }
    }
  })
})
