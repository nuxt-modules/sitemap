import { getPathRobotConfig } from '#robots/server'
import { defineEventHandler } from 'nuxt/server'

export default defineEventHandler(event => ({
  skipped: getPathRobotConfig(event, { path: '/about', skipSiteIndexable: true }),
  normal: getPathRobotConfig(event, { path: '/about' }),
}))
