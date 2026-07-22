import { describe, expect, it } from 'vitest'
import { isValidW3CDate, normaliseDate } from '../../src/runtime/server/sitemap/urlset/normalise'

describe('lastmod', () => {
  it('w3c validate', () => {
    expect(isValidW3CDate('2023-12-21')).toBeTruthy()
    expect(isValidW3CDate('2023-12-21T22:46:58Z')).toBeTruthy()
    expect(isValidW3CDate('2023-12-21T22:46:58+00:00')).toBeTruthy()
    expect(isValidW3CDate('2023-12-21T22:46:58.441+00:00')).toBeTruthy()
    expect(isValidW3CDate('1994-11-05T13:15:30Z')).toBeTruthy()
    expect(isValidW3CDate('1994-11-05T08:15:30-05:00')).toBeTruthy()
    expect(isValidW3CDate('1994-11-05T08:15:30-05:00')).toBeTruthy()
  })
  it('date create', () => {
    // time without timezone
    expect(normaliseDate('2023-12-21T13:49:27.963745')).toMatchInlineSnapshot(`"2023-12-21T13:49:27Z"`)
  })

  it('rejects semantically impossible dates that match the shape regex', () => {
    // Feb 30 doesn't exist; 2024 is a leap year so Feb has 29 days max.
    expect(isValidW3CDate('2024-02-30')).toBeFalsy()
    // April has 30 days.
    expect(isValidW3CDate('2024-04-31')).toBeFalsy()
    // 2023 is not a leap year.
    expect(isValidW3CDate('2023-02-29')).toBeFalsy()
    // month 13 matches the [01]\d shape but isn't a real month.
    expect(isValidW3CDate('2024-13-01')).toBeFalsy()
  })

  it('rejects garbage surrounding an otherwise-valid date (regex must be anchored)', () => {
    expect(isValidW3CDate('garbage2024-01-15T09:30:00Z')).toBeFalsy()
    expect(isValidW3CDate('2024-01-15T09:30:00Zjunk')).toBeFalsy()
  })
})
