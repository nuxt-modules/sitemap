import { safeParse } from 'valibot'
import { describe, expect, it } from 'vitest'
import { defineSitemapSchema } from '../../src/content-valibot'

describe('defineSitemapSchema', () => {
  it('keeps dates and nested media fields', () => {
    const value = {
      lastmod: new Date('2026-01-01'),
      changefreq: 'weekly',
      videos: [{ content_loc: '/video.mp4', restriction: { relationship: 'allow', value: 'AU' } }],
    }
    expect(safeParse(defineSitemapSchema(), value)).toMatchObject({ success: true, output: value })
  })

  it('rejects video entries without a content location', () => {
    expect(safeParse(defineSitemapSchema(), { videos: [{ title: 'Video' }] }).success).toBe(false)
  })

  it('requires a name for collection callbacks', () => {
    expect(() => defineSitemapSchema({ filter: () => true })).toThrow('name')
  })
})
