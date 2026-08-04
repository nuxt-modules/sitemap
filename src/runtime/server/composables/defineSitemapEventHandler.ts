import type { EventHandlerRequest, EventHandlerResponse } from '#nuxtseo/h3'
import type { SitemapUrlInput } from '../../types'
import { defineEventHandler } from '#nuxtseo/h3'

export const defineSitemapEventHandler: typeof defineEventHandler<EventHandlerRequest, EventHandlerResponse<SitemapUrlInput[]>> = defineEventHandler
