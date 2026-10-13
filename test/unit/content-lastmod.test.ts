import { describe, expect, it } from 'vitest'
import { resolveContentLastmod } from '../../src/utils-internal/contentLastmod'

describe('resolveContentLastmod', () => {
  it('prefers a modification date over a publication date', () => {
    expect(resolveContentLastmod({ publishedAt: '2024-01-01', updatedAt: '2024-06-01' })).toBe('2024-06-01')
  })

  it('reads seo.articleModifiedTime first', () => {
    expect(resolveContentLastmod({ seo: { articleModifiedTime: '2024-07-01' }, updatedAt: '2024-06-01' })).toBe('2024-07-01')
  })

  it('falls back to the publication date', () => {
    expect(resolveContentLastmod({ publishedAt: '2024-01-01' })).toBe('2024-01-01')
    expect(resolveContentLastmod({ date: '2023-03-04' })).toBe('2023-03-04')
  })

  it('reads undeclared frontmatter from meta', () => {
    expect(resolveContentLastmod({ meta: { date: '2022-02-02' } })).toBe('2022-02-02')
  })

  it('accepts a Date that YAML parsed', () => {
    const date = new Date('2021-10-20')
    expect(resolveContentLastmod({ date })).toBe(date)
  })

  it('skips a value that is not a date', () => {
    expect(resolveContentLastmod({ updatedAt: 'soon', date: '2023-03-04' })).toBe('2023-03-04')
    expect(resolveContentLastmod({ date: true })).toBeUndefined()
    expect(resolveContentLastmod({ title: 'No dates' })).toBeUndefined()
  })
})
