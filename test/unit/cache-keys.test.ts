import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseHost, resolveCacheOrigin } from '../../src/runtime/server/cache-key'

const { cachedFunctions, siteConfig } = vi.hoisted(() => ({
  cachedFunctions: new Map<string, Record<string, any>>(),
  siteConfig: { value: {} as Record<string, any> },
}))

vi.mock('#nuxtseo/nitro', () => ({
  defineCachedFunction: (fn: unknown, opts: Record<string, any> = {}) => {
    cachedFunctions.set(opts.name, opts)
    return fn
  },
  useNitroApp: () => ({ hooks: { callHook: async () => {} } }),
}))
vi.mock('#site-config/server', () => ({
  getSiteConfig: () => siteConfig.value,
  createSitePathResolver: () => (path: string) => path,
}))
vi.mock('#robots/server', () => ({
  getPathRobotConfig: () => ({ indexable: true }),
}))
vi.mock('#sitemap-virtual/static-config.mjs', () => ({
  default: { cacheMaxAgeSeconds: 600, sitemaps: {} },
}))
vi.mock('#sitemap-virtual/global-sources.mjs', () => ({ sources: [] }))
vi.mock('#sitemap-virtual/child-sources.mjs', () => ({ sources: {} }))
vi.mock('#sitemap-virtual/read-sources.mjs', () => ({ readSourcesFromFilesystem: vi.fn() }))

const SAFE_KEY_RE = /^[\w-]+$/

const UNUSUAL_HOSTS = [
  'example.com#frag',
  'example.com?x=1',
  'example.com/path',
  '../example.com',
  'example.com/../../other',
  'user@example.com',
  'example .com',
  'example.com:80@other.test',
  'example.com..',
  '',
]

function createEvent(headers: Record<string, string>, url = 'https://internal.test/sitemap.xml') {
  return { req: new Request(url, { headers }), context: {} } as any
}

// Each cached function, with the arguments Nitro passes to its `getKey`.
const CACHED_FUNCTIONS: Array<[string, (e: any) => unknown[]]> = [
  ['sitemap:runtime-sitemaps', e => [e, {}]],
  ['sitemap:xml', e => [e, { sitemapName: 'pages' }, {}, {}]],
  ['sitemap:index', e => [e, {}, {}, {}]],
  ['sitemap:resolved-urls', e => [e, {}, 'pages', false, {}, {}]],
  ['sitemap:source-urls', e => [e, '/api/urls::{}', '/api/urls', {}]],
]

function getKey(name: string, e: any): string {
  const entry = CACHED_FUNCTIONS.find(([n]) => n === name)!
  return cachedFunctions.get(name)!.getKey(...entry[1](e))
}

beforeAll(async () => {
  await import('../../src/runtime/server/utils')
  await import('../../src/runtime/server/sitemap/nitro')
  await import('../../src/runtime/server/sitemap/builder/sitemap-index')
  await import('../../src/runtime/server/sitemap/builder/sitemap')
  await import('../../src/runtime/server/sitemap/urlset/sources')
})

beforeEach(() => {
  siteConfig.value = { url: 'https://site.example', _context: { url: 'runtimeEnv' } }
})

describe('parseHost', () => {
  it('lowercases a hostname and keeps its port', () => {
    expect(parseHost('Example.COM')).toEqual({ _tag: 'Host', host: 'example.com' })
    expect(parseHost('sub.example.com:8080')).toEqual({ _tag: 'Host', host: 'sub.example.com:8080' })
    expect(parseHost('localhost:3000')).toEqual({ _tag: 'Host', host: 'localhost:3000' })
    expect(parseHost('127.0.0.1')).toEqual({ _tag: 'Host', host: '127.0.0.1' })
  })

  it.each([
    ...UNUSUAL_HOSTS,
    ' example.com',
    'example.com ',
    'example.com:0',
    'example.com:080',
    'example.com:65536',
    'example.com:',
    'example.com:80:80',
    '-example.com',
    'example-.com',
    'exa_mple.com',
    `${'a'.repeat(64)}.com`,
    `${'a.'.repeat(127)}com`,
    'bücher.example',
    undefined,
  ])('rejects %j', (raw) => {
    expect(parseHost(raw)).toEqual({ _tag: 'InvalidHost' })
  })
})

describe('resolveCacheOrigin', () => {
  it('accepts only http or https as the protocol', () => {
    const siteUrl = () => undefined
    expect(resolveCacheOrigin({ host: 'example.com', protocol: 'http', siteUrl })).toMatchObject({ protocol: 'http' })
    expect(resolveCacheOrigin({ host: 'example.com', protocol: 'gopher', siteUrl })).toMatchObject({ protocol: 'https' })
    expect(resolveCacheOrigin({ host: 'example.com', protocol: 'https/../x', siteUrl })).toMatchObject({ protocol: 'https' })
  })

  it('reads the site URL only for an invalid host', () => {
    const siteUrl = vi.fn(() => 'https://site.example')
    expect(resolveCacheOrigin({ host: 'example.com', protocol: 'https', siteUrl })._tag).toBe('Request')
    expect(siteUrl).not.toHaveBeenCalled()
    expect(resolveCacheOrigin({ host: 'example.com/x', protocol: 'https', siteUrl }))
      .toEqual({ _tag: 'SiteConfig', protocol: 'https', host: 'site.example' })
  })
})

describe.each(CACHED_FUNCTIONS.map(([name]) => name))('%s cache key', (name) => {
  it('is registered', () => {
    expect(cachedFunctions.get(name)?.getKey).toBeTypeOf('function')
  })

  it.each(UNUSUAL_HOSTS)('stays in a fixed alphabet for host %j', (host) => {
    for (const headers of [{ 'host': 'example.com', 'x-forwarded-host': host }, { host }]) {
      const key = getKey(name, createEvent(headers))
      expect(key).toMatch(SAFE_KEY_RE)
      if (host)
        expect(key).not.toContain(host)
    }
  })

  it('falls back to the site host for an invalid header', () => {
    const siteKey = getKey(name, createEvent({ host: 'site.example' }))
    for (const host of UNUSUAL_HOSTS)
      expect(getKey(name, createEvent({ host }))).toBe(siteKey)
  })

  it('keeps an invalid header apart from the site host when no site URL is configured', () => {
    siteConfig.value = { url: 'https://example.com', _context: { url: 'nitro:init' } }
    const siteKey = getKey(name, createEvent({ host: 'example.com' }))
    const keys = UNUSUAL_HOSTS.map(host => getKey(name, createEvent({ host })))
    expect(keys).not.toContain(siteKey)
    expect(new Set(keys).size).toBe(UNUSUAL_HOSTS.length)
    for (const key of keys)
      expect(key).toMatch(SAFE_KEY_RE)
  })

  it('produces one stable key per host', () => {
    const key = getKey(name, createEvent({ host: 'example.com' }))
    expect(getKey(name, createEvent({ host: 'example.com' }))).toBe(key)
    expect(getKey(name, createEvent({ host: 'EXAMPLE.com' }))).toBe(key)
    expect(getKey(name, createEvent({ 'host': 'internal.test', 'x-forwarded-host': 'example.com, proxy.test' }))).toBe(key)
  })

  it('gives distinct valid hosts distinct keys', () => {
    const hosts = ['example.com', 'example.org', 'a.example.com', 'example.com:8080', 'example.com:8081', 'examplecom', 'example-com', '127.0.0.1', 'localhost']
    const keys = hosts.map(host => getKey(name, createEvent({ host })))
    expect(new Set(keys).size).toBe(hosts.length)
  })

  it('keys on the protocol and ignores an unknown forwarded protocol', () => {
    const https = getKey(name, createEvent({ host: 'example.com' }))
    const http = getKey(name, createEvent({ host: 'example.com' }, 'http://internal.test/sitemap.xml'))
    expect(http).not.toBe(https)
    expect(getKey(name, createEvent({ 'host': 'example.com', 'x-forwarded-proto': 'http' }))).toBe(http)
    expect(getKey(name, createEvent({ 'host': 'example.com', 'x-forwarded-proto': 'https?x' }))).toBe(https)
  })
})

describe('cache key inputs besides the host', () => {
  it('separates sitemap names', () => {
    const e = createEvent({ host: 'example.com' })
    const xml = cachedFunctions.get('sitemap:xml')!
    const pages = xml.getKey(e, { sitemapName: 'pages' }, {}, {})
    const posts = xml.getKey(e, { sitemapName: 'posts' }, {}, {})
    expect(pages).not.toBe(posts)
    expect(xml.getKey(e, { sitemapName: 'a?b#c/../d' }, {}, {})).toMatch(SAFE_KEY_RE)
  })

  it('separates chunked and whole resolved URL sets', () => {
    const e = createEvent({ host: 'example.com' })
    const resolved = cachedFunctions.get('sitemap:resolved-urls')!
    expect(resolved.getKey(e, {}, 'pages', true)).not.toBe(resolved.getKey(e, {}, 'pages', false))
    expect(resolved.getKey(e, {}, 'pages', false)).not.toBe(resolved.getKey(e, {}, 'posts', false))
  })

  it('separates sources and keeps their options out of the key', () => {
    const e = createEvent({ host: 'example.com' })
    const source = cachedFunctions.get('sitemap:source-urls')!
    const secret = '/api/urls::{"headers":{"Authorization":"Bearer secret-token"}}'
    const key = source.getKey(e, secret)
    expect(key).toMatch(SAFE_KEY_RE)
    expect(key).not.toContain('secret-token')
    expect(key).not.toBe(source.getKey(e, '/api/urls::{}'))
  })
})
