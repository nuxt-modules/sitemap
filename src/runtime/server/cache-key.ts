import { hash } from 'ohash'
import { parseURL } from 'ufo'

export type RequestProtocol = 'http' | 'https'

export type ParsedHost
  = | { _tag: 'Host', host: string }
    | { _tag: 'InvalidHost' }

/**
 * The origin a cached sitemap function is keyed on.
 *
 * - `Request`: the request host, normalized.
 * - `SiteConfig`: the request host is invalid, so the configured site URL stands in for it.
 * - `Unrecognised`: the request host is invalid and no site URL is configured. The raw value
 *   only ever reaches the key through the hash.
 */
export type CacheOrigin
  = | { _tag: 'Request', protocol: RequestProtocol, host: string }
    | { _tag: 'SiteConfig', protocol: RequestProtocol, host: string }
    | { _tag: 'Unrecognised', protocol: RequestProtocol, rawHost: string }

export type CacheKeyPart = string | number | boolean

export interface CacheOriginInput {
  /** The first `X-Forwarded-Host` value, else the `Host` header. */
  host: string | undefined
  /** The request protocol. */
  protocol: string | undefined
  /** The configured site URL. Read only when the request host is invalid. */
  siteUrl: () => string | undefined
}

// RFC 1123 label: letters, digits and inner hyphens, 63 characters at most.
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const PORT_RE = /^[1-9]\d{0,4}$/
const UPPER_ASCII_RE = /[A-Z]/g
const INVALID_HOST: ParsedHost = { _tag: 'InvalidHost' }

/**
 * Parse a `Host` value into a lowercase hostname with an optional port.
 */
export function parseHost(raw: string | undefined): ParsedHost {
  // Lowercase ASCII only: every other character fails the label check below.
  const value = (raw || '').replace(UPPER_ASCII_RE, c => c.toLowerCase())
  const [hostname = '', port, ...rest] = value.split(':')
  if (rest.length > 0 || hostname.length > 253)
    return INVALID_HOST
  if (!hostname.split('.').every(label => LABEL_RE.test(label)))
    return INVALID_HOST
  if (port === undefined)
    return { _tag: 'Host', host: hostname }
  if (!PORT_RE.test(port) || Number(port) > 65535)
    return INVALID_HOST
  return { _tag: 'Host', host: `${hostname}:${port}` }
}

export function parseProtocol(raw: string | undefined): RequestProtocol | undefined {
  return raw === 'http' || raw === 'https' ? raw : undefined
}

export function resolveCacheOrigin(input: CacheOriginInput): CacheOrigin {
  const protocol = parseProtocol(input.protocol) ?? 'https'
  const request = parseHost(input.host)
  if (request._tag === 'Host')
    return { _tag: 'Request', protocol, host: request.host }
  const siteUrl = input.siteUrl()
  if (siteUrl) {
    const url = parseURL(siteUrl)
    const site = parseHost(url.host)
    if (site._tag === 'Host')
      return { _tag: 'SiteConfig', protocol: parseProtocol(url.protocol?.slice(0, -1)) ?? 'https', host: site.host }
  }
  return { _tag: 'Unrecognised', protocol, rawHost: input.host || '' }
}

/**
 * A cache key built only from base64url characters, whatever the inputs hold.
 *
 * A `SiteConfig` origin keys like a request for the same host, so both share one entry.
 */
export function createCacheKey(origin: CacheOrigin, parts: readonly CacheKeyPart[]): string {
  const scope = origin._tag === 'Unrecognised'
    ? { protocol: origin.protocol, rawHost: origin.rawHost }
    : { protocol: origin.protocol, host: origin.host }
  return `sitemap-${hash([scope, parts])}`
}
