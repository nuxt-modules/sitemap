import type { H3Event } from 'h3'

export function getPathRobotConfig(_e: H3Event, _options: any) {
  return { indexable: true, rule: 'index, follow' }
}
