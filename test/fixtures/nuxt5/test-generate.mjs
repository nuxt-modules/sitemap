import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const sitemap = await readFile(new URL('.output/public/sitemap.xml', import.meta.url), 'utf8')

assert.match(sitemap, /https:\/\/nuxt5\.example\.com\/included/)
assert.doesNotMatch(sitemap, /excluded/)
