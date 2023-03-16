import { getRequestHeader } from 'h3'
import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#internal/nitro'

export function useHostname(e: H3Event, hostName?: string) {
  if (hostName)
    return hostName
  const host = getRequestHeader(e, 'host') || process.env.NITRO_HOST || process.env.HOST
  const protocol = getRequestHeader(e, 'x-forwarded-proto') || 'http'
  const useHttp = process.env.NODE_ENV === 'development' || host.includes('127.0.0.1') || host.includes('localhost') || protocol === 'http'
  const port = process.env.NITRO_PORT || process.env.PORT
  const base = useRuntimeConfig().app.baseURL
  return `http${useHttp ? '' : 's'}://${host}${port ? `:${port}` : ''}${base}`
}
