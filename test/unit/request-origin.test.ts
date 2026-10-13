import type { RequestEvent } from 'nuxt/server'
import { describe, expect, it } from 'vitest'
import { getDecodedRouterParam, getForwardedHost, getForwardedProtocol, getRequestPathname } from '../../src/runtime/server/request'

function event(url: string, headers: Record<string, string> = {}, params?: Record<string, string>): RequestEvent {
  return {
    req: new Request(url, { headers }),
    url: new URL(url),
    res: { headers: new Headers() },
    context: { params },
  } as RequestEvent
}

describe('request origin', () => {
  it('prefers the first X-Forwarded-Host value', () => {
    expect(getForwardedHost(event('http://internal:3000/sitemap.xml', { 'host': 'internal:3000', 'x-forwarded-host': 'example.com, proxy.local' }))).toBe('example.com')
  })

  it('falls back to the Host header', () => {
    expect(getForwardedHost(event('http://internal:3000/sitemap.xml', { host: 'internal:3000' }))).toBe('internal:3000')
  })

  it('reads http or https from X-Forwarded-Proto', () => {
    expect(getForwardedProtocol(event('http://internal/sitemap.xml', { 'x-forwarded-proto': 'https, http' }))).toBe('https')
  })

  it('ignores another X-Forwarded-Proto value and uses the request URL', () => {
    expect(getForwardedProtocol(event('http://internal/sitemap.xml', { 'x-forwarded-proto': 'ftp' }))).toBe('http')
  })

  it('reads the request path', () => {
    expect(getRequestPathname(event('https://example.com/__sitemap__/pages.xml?x=1'))).toBe('/__sitemap__/pages.xml')
  })

  it('decodes a route param', () => {
    expect(getDecodedRouterParam(event('https://example.com/', {}, { sitemap: 'caf%C3%A9.xml' }), 'sitemap')).toBe('café.xml')
    expect(getDecodedRouterParam(event('https://example.com/', {}, { sitemap: '100%.xml' }), 'sitemap')).toBe('100%.xml')
    expect(getDecodedRouterParam(event('https://example.com/'), 'sitemap')).toBeUndefined()
  })
})
