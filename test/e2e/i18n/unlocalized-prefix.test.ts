import { get } from 'node:http'
import { createResolver } from '@nuxt/kit'
import { setup, url } from '@nuxt/test-utils'
import { expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)
await setup({ rootDir: resolve('../../fixtures/i18n-unlocalized'), dev: false })

function request(path: string, host: string) {
  return new Promise<{ status: number | undefined, body: string }>((resolve, reject) => {
    get(url(path), { headers: { host } }, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', chunk => body += chunk)
      response.on('end', () => resolve({ status: response.statusCode, body }))
      response.on('error', reject)
    }).on('error', reject)
  })
}

it.each([
  ['english-brand.com', 'en'],
  ['german-brand.de', 'de'],
])('keeps a nonlocalized locale-like route on %s', async (host, locale) => {
  expect((await request('/en/legal', host)).status).toBe(200)

  const sitemap = await request(`/__sitemap__/${locale}-pages.xml`, host)

  expect(sitemap.status).toBe(200)
  expect(sitemap.body).toContain(`<loc>https://${host}/en/legal</loc>`)
  expect(sitemap.body).not.toContain(`<loc>https://${host}/legal</loc>`)
  expect(sitemap.body).not.toContain(`<loc>https://${host}/de/en/legal</loc>`)
})
