import type { RequestEvent } from 'nuxt/server'

export function getPathRobotConfig(_e: RequestEvent, _options: any) {
  return { indexable: true, rule: 'index, follow' }
}
