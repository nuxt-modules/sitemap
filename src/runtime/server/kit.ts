import type { NitroRouteRules } from 'nitropack'
import { defu } from 'defu'
import { useRuntimeConfig } from 'nitropack/runtime'
import { createRouter as createRadixRouter, toRouteMatcher } from 'radix3'
import { parseURL, withoutBase, withoutTrailingSlash } from 'ufo'

function withoutQuery(path: string): string {
  const queryIndex = path.indexOf('?')
  return queryIndex === -1 ? path : path.slice(0, queryIndex)
}

let cachedRouteRuleMatcher: ((pathOrUrl: string) => NitroRouteRules) | undefined

export function createNitroRouteRuleMatcher(): (pathOrUrl: string) => NitroRouteRules {
  if (!import.meta.dev && cachedRouteRuleMatcher)
    return cachedRouteRuleMatcher

  const { nitro, app } = useRuntimeConfig()
  const _routeRulesMatcher = toRouteMatcher(
    createRadixRouter({
      routes: Object.fromEntries(
        Object.entries(nitro?.routeRules || {})
          .map(([path, rules]) => [withoutTrailingSlash(path), rules]),
      ),
    }),
  )
  const matcher = (pathOrUrl: string) => {
    const path = pathOrUrl[0] === '/' ? pathOrUrl : parseURL(pathOrUrl, app.baseURL).pathname
    return defu({}, ..._routeRulesMatcher.matchAll(
      withoutBase(withoutTrailingSlash(withoutQuery(path)), app.baseURL),
    ).reverse()) as NitroRouteRules
  }
  if (!import.meta.dev)
    cachedRouteRuleMatcher = matcher
  return matcher
}
