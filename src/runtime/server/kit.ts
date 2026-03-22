import type { NitroRouteRules } from 'nitropack'
import { defu } from 'defu'
import { useRuntimeConfig } from 'nitropack/runtime'
import { createRouter as createRadixRouter, toRouteMatcher } from 'radix3'
import { parseURL, withoutBase, withoutTrailingSlash } from 'ufo'

export function withoutQuery(path: string) {
  return path.split('?')[0]
}

export function createNitroRouteRuleMatcher() {
  const { nitro, app } = useRuntimeConfig()
  const _routeRulesMatcher = toRouteMatcher(
    createRadixRouter({
      routes: Object.fromEntries(
        Object.entries(nitro?.routeRules || {})
          .map(([path, rules]) => [path === '/' ? path : withoutTrailingSlash(path), rules]),
      ),
    }),
  )
  return (pathOrUrl: string) => {
    const path = pathOrUrl[0] === '/' ? pathOrUrl : parseURL(pathOrUrl, app.baseURL).pathname
    const pathWithoutQuery = withoutQuery(path)
    return defu({}, ..._routeRulesMatcher.matchAll(
      // radix3 does not support trailing slashes
      withoutBase(pathWithoutQuery === '/' ? pathWithoutQuery : withoutTrailingSlash(pathWithoutQuery), app.baseURL),
    ).reverse()) as NitroRouteRules
  }
}
