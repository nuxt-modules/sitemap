import type { EventHandler } from 'nuxt/server'
import type { SitemapUrlInput } from '../../types'
import { defineEventHandler } from 'nuxt/server'

export function defineSitemapEventHandler(handler: EventHandler<SitemapUrlInput[] | Promise<SitemapUrlInput[]>>) {
  return defineEventHandler(handler)
}
