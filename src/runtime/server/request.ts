import type { RequestEvent } from 'nuxt/server'
import { getRequestHeader } from 'nuxt/server'

// Request reads that never reach Nuxt's core `nuxt/server` module.
//
// On Nuxt 4.6 with Nitro 2, `getRequestHost`, `getRequestProtocol`, `getRequestURL` and
// `getRouterParam` from `nuxt/server` run through `nuxt/dist/server/index.js`, which imports the
// app config. The server bundle then runs `app.config.ts`, and under
// `future.compatibilityVersion: 5` nothing defines its `defineAppConfig` call there.
// `getRequestHeader` is safe on every builder: Nitro 2 serves it from h3 directly.
//
// The forwarded headers are trusted, as the replaced calls trusted them with
// `xForwardedHost: true` and `xForwardedProto: true`.

function firstHeaderValue(value: string | undefined): string | undefined {
  return value?.split(',')[0]?.trim() || undefined
}

/** The request URL. Nitro 3 and the Nitro 2 `nuxt/server` event both carry it as `url`. */
function requestUrl(e: RequestEvent): URL | undefined {
  const { url } = e as { url?: URL }
  if (url)
    return url
  // Core `nuxt/server` falls back to `req.url` too. A plain h3 v1 event has a relative one.
  const href = (e.req as { url?: unknown } | undefined)?.url
  return typeof href === 'string' && URL.canParse(href) ? new URL(href) : undefined
}

/** The first `X-Forwarded-Host` value, else the `Host` header. */
export function getForwardedHost(e: RequestEvent): string {
  return firstHeaderValue(getRequestHeader(e, 'x-forwarded-host')) || getRequestHeader(e, 'host') || ''
}

/** The first `X-Forwarded-Proto` value when it is `http` or `https`, else the protocol of the request URL. */
export function getForwardedProtocol(e: RequestEvent): string | undefined {
  const forwarded = firstHeaderValue(getRequestHeader(e, 'x-forwarded-proto'))
  if (forwarded === 'http' || forwarded === 'https')
    return forwarded
  return requestUrl(e)?.protocol.slice(0, -1)
}

/** The path of the request URL, percent-encoded. */
export function getRequestPathname(e: RequestEvent): string {
  const url = requestUrl(e)
  if (!url)
    throw new TypeError('[@nuxtjs/sitemap] The request event has no absolute URL.')
  return url.pathname
}

/** A route param, percent-decoded. */
export function getDecodedRouterParam(e: RequestEvent, name: string): string | undefined {
  const value = e.context.params?.[name]
  if (value === undefined)
    return undefined
  try {
    return decodeURIComponent(value)
  }
  catch {
    // A malformed escape cannot be decoded, so the param stays as the router matched it.
    return value
  }
}
