import { describe, expect, it } from 'vitest'
import { isValidW3CDate } from '../../src/runtime/nitro/sitemap/urlset/normalise'

describe('lastmod', () => {
  it('default', async () => {
    expect(isValidW3CDate('2023-12-21')).toBeTruthy()
    expect(isValidW3CDate('2023-12-21T22:46:58Z')).toBeTruthy()
    expect(isValidW3CDate('2023-12-21T22:46:58+00:00')).toBeTruthy()
    expect(isValidW3CDate('2023-12-21T22:46:58.441+00:00')).toBeTruthy()
    expect(isValidW3CDate('1994-11-05T13:15:30Z')).toBeTruthy()
    expect(isValidW3CDate('1994-11-05T08:15:30-05:00')).toBeTruthy()
    expect(isValidW3CDate('1994-11-05T08:15:30-05:00')).toBeTruthy()
  })
})
