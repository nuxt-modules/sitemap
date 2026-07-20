import { bench, describe } from 'vitest'
import { createPathFilter } from '../../src/runtime/utils-pure'

const urls = Array.from({ length: 100_000 }, (_, i) => `https://example.com/catalog/${i}/product-${i}`)
const paths = urls.map((_, i) => `/catalog/${i}/product-${i}`)

describe('path filtering', () => {
  const filter = createPathFilter({
    include: ['/catalog/**'],
    exclude: ['/catalog/10/**'],
  })

  bench('100,000 pre-parsed paths', () => {
    for (let i = 0; i < urls.length; i++)
      filter(urls[i]!, paths[i])
  }, { iterations: 10 })
})
