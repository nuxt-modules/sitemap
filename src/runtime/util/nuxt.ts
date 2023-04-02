import { getRequestHeader } from 'h3'
import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#internal/nitro'

export function useHostname(e: H3Event) {
  const sitemapConfig = useRuntimeConfig()['nuxt-simple-sitemap']
  if (!process.dev && sitemapConfig.siteUrl)
    return sitemapConfig.siteUrl
  const host = getRequestHeader(e, 'host') || process.env.NITRO_HOST || process.env.HOST || 'localhost'
  const protocol = getRequestHeader(e, 'x-forwarded-proto') || 'http'
  const useHttp = process.env.NODE_ENV === 'development' || host.includes('127.0.0.1') || host.includes('localhost') || protocol === 'http'
  const port = host.includes(':') ? host.split(':').pop() : (process.env.NITRO_PORT || process.env.PORT)
  const base = useRuntimeConfig().app.baseURL
  return `http${useHttp ? '' : 's'}://${host}${port ? `:${port}` : ''}${base}`
}
