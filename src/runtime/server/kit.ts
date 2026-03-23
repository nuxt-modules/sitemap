import type { NitroRouteRules } from 'nitropack'
import { createNitroRouteRuleMatcher as _createNitroRouteRuleMatcher, withoutQuery } from '#nuxtseo-shared/server/kit'
import { useRuntimeConfig } from 'nitropack/runtime'
import { parseURL } from 'ufo'

export { withoutQuery }

export function createNitroRouteRuleMatcher(): (pathOrUrl: string) => NitroRouteRules {
  const { app } = useRuntimeConfig()
  const matcher = _createNitroRouteRuleMatcher()
  return (pathOrUrl: string) => {
    const path = pathOrUrl[0] === '/' ? pathOrUrl : parseURL(pathOrUrl, app.baseURL).pathname
    return matcher(path)
  }
}
