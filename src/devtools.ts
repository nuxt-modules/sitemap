import { existsSync } from 'node:fs'
import type { Nuxt } from 'nuxt/schema'
import type { Resolver } from '@nuxt/kit'
import { useNuxt } from '@nuxt/kit'
import type { ModuleOptions } from './module'
import { addCustomTab } from '@nuxt/devtools-kit'

const DEVTOOLS_UI_ROUTE = '/__sitemap__/devtools'
const DEVTOOLS_UI_LOCAL_PORT = 3030

export function setupDevToolsUI(options: ModuleOptions, resolve: Resolver['resolve'], nuxt: Nuxt = useNuxt()) {
  const clientPath = resolve('./client')
  const isProductionBuild = existsSync(clientPath)

  // Serve production-built client (used when package is published)
  if (isProductionBuild) {
    nuxt.hook('vite:serverCreated', async (server) => {
      const sirv = await import('sirv').then(r => r.default || r)
      server.middlewares.use(
        DEVTOOLS_UI_ROUTE,
        sirv(clientPath, { dev: true, single: true }),
      )
    })
  }
  // In local development, start a separate Nuxt Server and proxy to serve the client
  else {
    nuxt.hook('vite:extendConfig', (config) => {
      Object.assign(config, {
        server: {
          ...config.server,
          proxy: {
            ...config.server?.proxy,
            [DEVTOOLS_UI_ROUTE]: {
              target: `http://localhost:${DEVTOOLS_UI_LOCAL_PORT}${DEVTOOLS_UI_ROUTE}`,
              changeOrigin: true,
              followRedirects: true,
              rewrite: (path: string) => path.replace(DEVTOOLS_UI_ROUTE, ''),
            },
          },
        },
      })
    })
  }

  addCustomTab({
    // unique identifier
    name: 'sitemap',
    // title to display in the tab
    title: 'Sitemap',
    // any icon from Iconify, or a URL to an image
    icon: 'carbon:load-balancer-application',
    // iframe view
    view: {
      type: 'iframe',
      src: DEVTOOLS_UI_ROUTE,
    },
  })
}
