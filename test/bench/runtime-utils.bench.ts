import { bench, describe } from 'vitest'
import { xmlEscape } from '../../src/runtime/utils-pure'

const safeXmlValues = Array.from({ length: 100_000 }, (_, i) => `https://example.com/catalog/item-${i}`)
const mixedXmlValues = Array.from({ length: 100_000 }, (_, i) => `item-${i} & <category> "quoted"`)

describe('runtime utils', () => {
  bench('escape 100,000 safe values', () => {
    for (const value of safeXmlValues)
      xmlEscape(value)
  }, { iterations: 20 })

  bench('escape 100,000 mixed values', () => {
    for (const value of mixedXmlValues)
      xmlEscape(value)
  }, { iterations: 20 })
})
