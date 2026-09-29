import { describe, expect, it } from 'vitest'
import { robotsBlocksIndexing } from '../../src/runtime/utils-pure'

describe('robotsBlocksIndexing', () => {
  it.each([
    [false, true],
    ['noindex', true],
    ['noindex, nofollow', true],
    ['NoIndex,follow', true],
    ['none', true],
    [true, false],
    ['index, follow', false],
    ['index, nofollow', false],
    [undefined, false],
    ['', false],
  ])('%j blocks indexing: %s', (robots, expected) => {
    expect(robotsBlocksIndexing(robots)).toBe(expected)
  })
})
