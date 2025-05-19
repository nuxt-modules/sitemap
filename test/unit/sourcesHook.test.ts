import { describe, it, expect } from 'vitest'
import type { H3Event } from 'h3'
import type { SitemapSourcesHookCtx } from '../../src/runtime/types'

describe('sitemap:sources hook', () => {
  it('hook context is correctly typed', () => {
    // This is a type test to ensure our hook context is properly structured
    const mockEvent: Partial<H3Event> = {
      node: {
        req: {
          headers: {
            authorization: 'Bearer test-token',
          },
        } as any,
      } as any,
    }

    const ctx: SitemapSourcesHookCtx = {
      event: mockEvent as H3Event,
      sitemapName: 'test-sitemap',
      sources: [
        '/api/test1',
        ['/api/test2', { headers: { 'X-Original': 'original' } }],
      ],
    }

    // Type checks - ensuring the structure is correct
    expect(ctx.event).toBeDefined()
    expect(ctx.sitemapName).toBe('test-sitemap')
    expect(ctx.sources).toBeDefined()
    expect(ctx.sources).toHaveLength(2)
  })

  it('hook can add new sources', () => {
    const mockEvent: Partial<H3Event> = {
      node: {
        req: {
          headers: {
            authorization: 'Bearer test-token',
          },
        } as any,
      } as any,
    }

    const ctx: SitemapSourcesHookCtx = {
      event: mockEvent as H3Event,
      sitemapName: 'test-sitemap',
      sources: ['/api/existing'],
    }

    // Simulate adding a new source
    ctx.sources.push('/api/new-source')

    expect(ctx.sources).toHaveLength(2)
    expect(ctx.sources).toContain('/api/new-source')
  })

  it('hook can modify source headers', () => {
    const mockEvent: Partial<H3Event> = {
      node: {
        req: {
          headers: {
            authorization: 'Bearer test-token',
          },
        } as any,
      } as any,
    }

    const ctx: SitemapSourcesHookCtx = {
      event: mockEvent as H3Event,
      sitemapName: 'test-sitemap',
      sources: [
        { fetch: ['/api/test', { headers: { 'X-Original': 'original' } }] } as any,
      ],
    }

    // Simulate what a hook would do
    ctx.sources = ctx.sources.map((source) => {
      if (typeof source === 'object' && source.fetch) {
        const [url, options = {}] = Array.isArray(source.fetch) ? source.fetch : [source.fetch, {}]

        options.headers = options.headers || {}
        options.headers['X-Custom'] = 'custom-value'

        const authHeader = ctx.event.node?.req?.headers?.authorization
        if (authHeader) {
          options.headers['Authorization'] = authHeader
        }

        return { ...source, fetch: [url, options] }
      }
      return source
    })

    // Verify the modifications
    const modifiedSource = ctx.sources[0] as any
    const headers = modifiedSource.fetch[1].headers
    expect(headers['X-Original']).toBe('original')
    expect(headers['X-Custom']).toBe('custom-value')
    expect(headers['Authorization']).toBe('Bearer test-token')
  })

  it('hook can filter sources', () => {
    const mockEvent: Partial<H3Event> = {
      node: {
        req: {
          headers: {},
        } as any,
      } as any,
    }

    const ctx: SitemapSourcesHookCtx = {
      event: mockEvent as H3Event,
      sitemapName: 'test-sitemap',
      sources: [
        '/api/keep-this',
        '/api/skip-this',
        '/api/also-keep',
      ],
    }

    // Simulate filtering sources
    ctx.sources = ctx.sources.filter((source) => {
      if (typeof source === 'string') {
        return !source.includes('skip-this')
      }
      return true
    })

    expect(ctx.sources).toHaveLength(2)
    expect(ctx.sources).not.toContain('/api/skip-this')
    expect(ctx.sources).toContain('/api/keep-this')
    expect(ctx.sources).toContain('/api/also-keep')
  })
})
