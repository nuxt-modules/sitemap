import { getRequestHeader } from 'h3'
import type { H3Event } from 'h3'
import { withBase } from 'ufo'
import { useRuntimeConfig } from '#internal/nitro'

export function useHostname(e: H3Event) {
  const config = useRuntimeConfig()['nuxt-simple-sitemap']
  const base = useRuntimeConfig().app.baseURL
  if (!process.dev && config.siteUrl)
    return withBase(base, config.siteUrl)
  const host = getRequestHeader(e, 'host') || process.env.NITRO_HOST || process.env.HOST || 'localhost'
  const protocol = getRequestHeader(e, 'x-forwarded-proto') || 'http'
  const useHttp = process.env.NODE_ENV === 'development' || host.includes('127.0.0.1') || host.includes('localhost') || protocol === 'http'
  const port = host.includes(':') ? host.split(':').pop() : (process.env.NITRO_PORT || process.env.PORT)
  return withBase(base, `http${useHttp ? '' : 's'}://${host.includes(':') ? host.split(':')[0] : host}${port ? `:${port}` : ''}`)
}
