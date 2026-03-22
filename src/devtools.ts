import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from 'nuxt/schema'
import type { ModuleOptions } from './module'
import { useNuxt } from '@nuxt/kit'
import { setupDevToolsUI as _setupDevToolsUI } from 'nuxtseo-shared/devtools'

export function setupDevToolsUI(_options: ModuleOptions, resolve: Resolver['resolve'], nuxt: Nuxt = useNuxt()) {
  _setupDevToolsUI(
    { route: '/__sitemap__/devtools', name: 'sitemap', title: 'Sitemap', icon: 'carbon:load-balancer-application' },
    resolve,
    nuxt,
  )
}
