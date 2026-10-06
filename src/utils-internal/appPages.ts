import type { Nuxt, NuxtPage } from '@nuxt/schema'

/** Read available pages without waiting for a later Nuxt lifecycle phase. */
export function createAppPagesReader(nuxt: Nuxt): () => NuxtPage[] {
  let resolvedPages: NuxtPage[] | undefined
  nuxt.hooks.hook('pages:resolved', (pages) => {
    resolvedPages = pages
  })
  return () => {
    if (nuxt.options.pages === false || (typeof nuxt.options.pages === 'object' && nuxt.options.pages.enabled === false))
      return []
    return resolvedPages ?? nuxt.apps.default?.pages ?? []
  }
}
