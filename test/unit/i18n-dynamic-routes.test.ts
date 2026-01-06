import { describe, expect, it } from 'vitest'
import { applyDynamicParams, findPageMapping } from '../../src/runtime/utils-pure'

describe('i18n dynamic routes', () => {
  const pages = {
    about: { en: '/about', fr: '/a-propos' },
    posts: { en: '/posts/[slug]', fr: '/article/[slug]', es: '/articulo/[slug]' },
    products: { en: '/products/[category]/[id]', fr: '/produits/[category]/[id]' },
    'blog/posts': { en: '/blog/posts/[slug]', fr: '/blog/articles/[slug]' },
  }

  describe('findPageMapping', () => {
    it('exact match for static route', () => {
      const result = findPageMapping('/about', pages)
      expect(result).toEqual({ mappings: pages.about, paramSegments: [] })
    })

    it('prefix match for single param route', () => {
      const result = findPageMapping('/posts/my-slug', pages)
      expect(result).toEqual({ mappings: pages.posts, paramSegments: ['my-slug'] })
    })

    it('prefix match for multi param route', () => {
      const result = findPageMapping('/products/electronics/laptop-123', pages)
      expect(result).toEqual({ mappings: pages.products, paramSegments: ['electronics', 'laptop-123'] })
    })

    it('matches most specific key first', () => {
      const result = findPageMapping('/blog/posts/hello', pages)
      expect(result).toEqual({ mappings: pages['blog/posts'], paramSegments: ['hello'] })
    })

    it('returns null for no match', () => {
      const result = findPageMapping('/unknown/path', pages)
      expect(result).toBeNull()
    })

    it('handles path without leading slash', () => {
      const result = findPageMapping('posts/test', pages)
      expect(result).toEqual({ mappings: pages.posts, paramSegments: ['test'] })
    })
  })

  describe('applyDynamicParams', () => {
    it('replaces single param', () => {
      expect(applyDynamicParams('/article/[slug]', ['my-post'])).toBe('/article/my-post')
    })

    it('replaces multiple params', () => {
      expect(applyDynamicParams('/produits/[category]/[id]', ['tech', 'item-1'])).toBe('/produits/tech/item-1')
    })

    it('returns path unchanged when no params', () => {
      expect(applyDynamicParams('/about', [])).toBe('/about')
    })

    it('handles missing params gracefully', () => {
      expect(applyDynamicParams('/[a]/[b]/[c]', ['x', 'y'])).toBe('/x/y/')
    })
  })
})
