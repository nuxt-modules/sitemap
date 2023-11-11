import { type EventHandlerRequest, type EventHandlerResponse, defineEventHandler } from 'h3'
import type { SitemapUrlInput } from '../types'

export const defineSitemapEventHandler: typeof defineEventHandler<EventHandlerRequest, EventHandlerResponse<SitemapUrlInput[]>> = defineEventHandler
