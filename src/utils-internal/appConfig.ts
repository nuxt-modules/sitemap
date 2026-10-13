import { parseAndWalk, ScopeTracker } from 'oxc-walker'

const DEFINE_APP_CONFIG = 'defineAppConfig'
const QUERY_RE = /\?.*$/

/**
 * Give an `app.config` source a module-level `defineAppConfig` when it calls the auto-import
 * without declaring it.
 *
 * Returns `undefined` when the source needs nothing added.
 */
export function withDefineAppConfigFallback(code: string, filename: string): string | undefined {
  if (!code.includes(DEFINE_APP_CONFIG))
    return undefined
  // Keep the module scope after the walk so the check below can read it.
  const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
  const { errors } = parseAndWalk(code, filename, { scopeTracker })
  // A syntax error is left for the bundler, which reports it with a code frame.
  if (errors.length || scopeTracker.isDeclared(DEFINE_APP_CONFIG))
    return undefined
  // A function declaration hoists, so appending it keeps every original line in place.
  return `${code}\nfunction ${DEFINE_APP_CONFIG}(config) { return config }\n`
}

/**
 * Nuxt 4.6 with `future.compatibilityVersion: 5` turns Nitro auto-imports off, yet `nuxt/server`
 * still imports every layer `app.config` into the server bundle. Nothing defines
 * `defineAppConfig` there, so the bundle throws a `ReferenceError` when it loads.
 */
export function defineAppConfigFallbackPlugin(getAppConfigFiles: () => string[]) {
  return {
    name: 'nuxt-sitemap:define-app-config-fallback',
    transform(code: string, id: string) {
      const file = id.replace(QUERY_RE, '').replaceAll('\\', '/')
      if (!getAppConfigFiles().includes(file))
        return undefined
      const transformed = withDefineAppConfigFallback(code, file)
      return transformed === undefined ? undefined : { code: transformed, map: null }
    },
  }
}
