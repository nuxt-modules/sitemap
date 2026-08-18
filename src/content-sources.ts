import type { AppSourceContext } from './runtime/types'

/**
 * App source name for comark-content collections.
 *
 * Distinct from the `@nuxt/content` sources so `excludeAppSources` can target one
 * provider without touching the other, and so the debug endpoint names the module
 * that actually produced the URLs.
 */
export const COMARK_CONTENT_SOURCE: AppSourceContext = '@harlan-zw/comark-content:urls'

/** Route the comark-content app source fetches. */
export const COMARK_CONTENT_SITEMAP_ROUTE = '/__sitemap__/comark-content-urls.json'
