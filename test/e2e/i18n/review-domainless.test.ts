import { get } from 'node:http'
import { createResolver } from '@nuxt/kit'
import { setup, url } from '@nuxt/test-utils'
import { expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)
await setup({ rootDir: resolve('../../fixtures/review-domainless'), dev: false })
function request(path: string) {
  return new Promise<{ status: number | undefined, body: string }>((resolve, reject) => {
    get(url(path), { headers: { host: 'english-brand.com' } }, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', chunk => body += chunk)
      response.on('end', () => resolve({ status: response.statusCode, body }))
      response.on('error', reject)
    }).on('error', reject)
  })
}
it('includes a reachable locale without configured domains', async () => {
  const page = await request('/de/about')
  expect(page.status).toBe(200)
  const sitemap = await request('/__sitemap__/de-pages.xml')
  expect(sitemap.status).toBe(200)
  expect(sitemap.body).toContain('<loc>https://english-brand.com/de/about</loc>')
})
