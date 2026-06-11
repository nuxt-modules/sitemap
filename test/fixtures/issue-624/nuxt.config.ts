import NuxtSitemap from '../../../src/module'

// https://github.com/nuxt-modules/sitemap/issues/624
// Hybrid rendering. A prerendered page can end up in `nitro._prerenderedRoutes`
// with a text/html contentType but WITHOUT a `_sitemap` property (the sitemap
// module's `prerender:generate` hook early-returns for: empty `route.contents`,
// redirect-style HTML, or nitro versions that don't expose contents in the hook).
//
// `/prerendered/a` keeps its `_sitemap` (control), `/prerendered/b` has it stripped
// to reproduce the exact state the reporter observed: present in `allPrerenderedPaths`
// (so it is removed from the page source) but dropped from `prerenderUrlsFinal`,
// so it vanishes from the sitemap entirely.
export default defineNuxtConfig({
  modules: [
    NuxtSitemap,
    function (_options, nuxt) {
      nuxt.hook('nitro:init', (nitro) => {
        nitro.hooks.hook('prerender:route', (route: any) => {
          // simulate the upstream condition: a valid text/html prerender with no `_sitemap`
          if (route.route === '/prerendered/b')
            delete route._sitemap
          // inject an internal, extensionless text/html route with no `_sitemap`:
          // the fallback must not synthesize it into the sitemap
          if (route.route === '/') {
            nitro._prerenderedRoutes!.push({
              route: '/_internal',
              fileName: '/_internal.html',
              // @ts-expect-error partial prerender route for the test
              contentType: 'text/html',
            })
          }
        })
      })
    },
  ],

  site: {
    url: 'https://nuxtseo.com',
  },

  compatibilityDate: '2025-01-15',

  routeRules: {
    '/prerendered/**': { prerender: true },
    '/ssr': { prerender: false },
    // a prerendered redirect: must NOT appear in the sitemap
    '/old': { prerender: true, redirect: '/prerendered/a' },
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/'],
    },
  },

  sitemap: {
    autoLastmod: false,
    credits: false,
    debug: true,
  },
})
