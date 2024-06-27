import { defineEventHandler } from 'h3'
import type { EventHandlerRequest, EventHandlerResponse } from 'h3'
import type { SitemapUrlInput } from '../../types'

export const defineSitemapEventHandler: typeof defineEventHandler<EventHandlerRequest, EventHandlerResponse<SitemapUrlInput[]>> = defineEventHandler
