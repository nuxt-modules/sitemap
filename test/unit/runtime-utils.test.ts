import { describe, expect, it } from 'vitest'
import { createPathFilter, mergeOnKey, splitForLocales, xmlEscape } from '../../src/runtime/utils-pure'

describe('runtime utils', () => {
  it('escapes XML special characters in one pass', () => {
    expect(xmlEscape(`one & two < three > zero "double" 'single'`))
      .toBe('one &amp; two &lt; three &gt; zero &quot;double&quot; &apos;single&apos;')
    expect(xmlEscape(42)).toBe('42')
    expect(xmlEscape(false)).toBe('false')
  })

  it('splits only leading locale path segments', () => {
    const locales = new Set(['en', 'fr'])
    expect(splitForLocales('/en/about', locales)).toEqual(['en', '/about'])
    expect(splitForLocales('/en', locales)).toEqual(['en', ''])
    expect(splitForLocales('/ending', locales)).toEqual([null, '/ending'])
    expect(splitForLocales('/about/en', locales)).toEqual([null, '/about/en'])
    // Preserve the existing behavior for non-normalized paths without a leading slash.
    expect(splitForLocales('en/about', locales)).toEqual(['en', 'en/about'])
  })

  it('filters using an already parsed pathname', () => {
    const filter = createPathFilter({ include: ['/included/**'] }, '/base')
    expect(filter('https://wrong.example/excluded', '/base/included/page')).toBe(true)
    expect(filter('https://wrong.example/included', '/base/excluded/page')).toBe(false)
  })

  it('compacts merged entries in place', () => {
    const entries = [
      { key: 'a', values: ['first'] },
      { key: 'b', values: ['second'] },
      { key: 'a', values: ['third'] },
    ]
    const mergedKeys: string[] = []
    const result = mergeOnKey(entries, 'key', key => mergedKeys.push(key))

    expect(result).toBe(entries)
    expect(result).toEqual([
      { key: 'a', values: ['first', 'third'] },
      { key: 'b', values: ['second'] },
    ])
    expect(mergedKeys).toEqual(['a'])
  })

  it('skips merge bookkeeping for a single entry', () => {
    const entries = [{ key: 'only' }]
    const result = mergeOnKey(entries, 'key')

    expect(result).toBe(entries)
    expect(result).toEqual([{ key: 'only' }])
  })
})
