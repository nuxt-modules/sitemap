import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sitemap = await readFile(new URL('.output/public/sitemap.xml', import.meta.url), 'utf8')

assert.match(sitemap, /https:\/\/nuxt5\.example\.com\/included/)
// served by the `pages/` directory scan
assert.match(sitemap, /<loc>https:\/\/nuxt5\.example\.com\/<\/loc>/)
assert.doesNotMatch(sitemap, /excluded/)

assert.match(sitemap, /https:\/\/nuxt5\.example\.com\/authenticated-source/)
