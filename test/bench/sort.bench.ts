import { bench, describe } from 'vitest'
import { sortInPlace } from '../../src/runtime/server/sitemap/urlset/sort'

const urls = Array.from({ length: 50_000 }, (_, i) => ({
  loc: `/catalog/${i % 97}/category/${(i * 7919) % 50_000}/item-${50_000 - i}`,
}))

describe('sort', () => {
  bench('50,000 URLs', () => {
    sortInPlace([...urls])
  }, { iterations: 10 })
})
