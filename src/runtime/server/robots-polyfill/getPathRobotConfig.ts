import type { H3Event } from 'h3'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getPathRobotConfig(e: H3Event, options: any) {
  return { indexable: true, rule: 'index, follow' }
}
