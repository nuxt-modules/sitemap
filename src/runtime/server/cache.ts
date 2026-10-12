import type { H3Event } from 'h3'
import type { CacheKeyPart, CacheOrigin } from './cache-key'
import { getRequestHost, getRequestProtocol } from 'h3'
import { defineCachedFunction } from 'nitropack/runtime'
import { getSiteConfig } from '#site-config/server/composables/getSiteConfig'
import { createCacheKey, resolveCacheOrigin } from './cache-key'

// Site config fills `url` from the request host under this context when no URL is configured.
const REQUEST_SITE_URL_CONTEXT = 'nitro:init'

export function getCacheOrigin(e: H3Event): CacheOrigin {
  return resolveCacheOrigin({
    host: getRequestHost(e, { xForwardedHost: true }),
    protocol: getRequestProtocol(e, { xForwardedProto: true }),
    siteUrl: () => {
      const siteConfig = getSiteConfig(e, { debug: true })
      return siteConfig._context?.url === REQUEST_SITE_URL_CONTEXT ? undefined : siteConfig.url
    },
  })
}

interface SitemapCacheOptions<ArgsT extends [H3Event, ...any[]]> {
  name: string
  /** Inputs besides the origin that change the result, such as the sitemap name. */
  keyParts?: (...args: ArgsT) => CacheKeyPart[]
}

/**
 * A Nitro cached function in the `sitemap` storage, keyed on the request origin plus `keyParts`.
 * The key is always a hash, so a caller never builds a storage key by hand.
 */
export function defineSitemapCachedFunction<T, ArgsT extends [H3Event, ...any[]]>(
  fn: (...args: ArgsT) => T | Promise<T>,
  opts: SitemapCacheOptions<ArgsT>,
) {
  return defineCachedFunction(fn, {
    name: opts.name,
    group: 'sitemap',
    base: 'sitemap',
    maxAge: 60 * 10,
    swr: true,
    getKey: (...args: ArgsT) => createCacheKey(getCacheOrigin(args[0]), opts.keyParts?.(...args) ?? []),
  })
}
