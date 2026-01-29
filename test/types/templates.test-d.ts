import { describe, expectTypeOf, it } from 'vitest'
import type { NitroRouteRules, NitroRouteConfig, PrerenderRoute, NitroRuntimeHooks } from 'nitropack'
import type { NitroRouteRules as NitroRouteRulesTypes, NitroRouteConfig as NitroRouteConfigTypes, PrerenderRoute as PrerenderRouteTypes, NitroRuntimeHooks as NitroRuntimeHooksTypes } from 'nitropack/types'
import type { RouteMeta } from 'vue-router'
import type { PageMeta } from '#app'
import type {
  SitemapUrl,
  SitemapItemDefaults,
  SitemapIndexRenderCtx,
  SitemapInputCtx,
  SitemapRenderCtx,
  SitemapOutputHookCtx,
  SitemapSourcesHookCtx,
  SitemapSourceBase,
  SitemapSourceResolved,
} from '@nuxtjs/sitemap'
import type { readSourcesFromFilesystem } from '#sitemap-virtual/read-sources.mjs'
import type { sources as globalSources } from '#sitemap-virtual/global-sources.mjs'
import type { sources as childSources } from '#sitemap-virtual/child-sources.mjs'

// Tests the actual generated type augmentations from .nuxt/types/nuxt-sitemap-augments.d.ts
// and virtual module declarations from .nuxt/types/nuxt-sitemap-virtual.d.ts.
// Requires `nuxi prepare` to have been run so .nuxt/ exists.

describe('nitropack augmentations', () => {
  it('PrerenderRoute._sitemap is SitemapUrl', () => {
    expectTypeOf<PrerenderRoute['_sitemap']>().toEqualTypeOf<SitemapUrl | undefined>()
  })

  it('NitroRouteRules.sitemap is SitemapItemDefaults | false', () => {
    expectTypeOf<NitroRouteRules['sitemap']>().toEqualTypeOf<SitemapItemDefaults | false | undefined>()
  })

  it('NitroRouteRules.robots is boolean', () => {
    expectTypeOf<NitroRouteRules['robots']>().toEqualTypeOf<boolean | undefined>()
  })

  it('NitroRouteConfig.sitemap is SitemapItemDefaults | false', () => {
    expectTypeOf<NitroRouteConfig['sitemap']>().toEqualTypeOf<SitemapItemDefaults | false | undefined>()
  })

  it('NitroRuntimeHooks has all sitemap hooks', () => {
    expectTypeOf<NitroRuntimeHooks['sitemap:index-resolved']>()
      .toEqualTypeOf<(ctx: SitemapIndexRenderCtx) => void | Promise<void>>()
    expectTypeOf<NitroRuntimeHooks['sitemap:input']>()
      .toEqualTypeOf<(ctx: SitemapInputCtx) => void | Promise<void>>()
    expectTypeOf<NitroRuntimeHooks['sitemap:resolved']>()
      .toEqualTypeOf<(ctx: SitemapRenderCtx) => void | Promise<void>>()
    expectTypeOf<NitroRuntimeHooks['sitemap:output']>()
      .toEqualTypeOf<(ctx: SitemapOutputHookCtx) => void | Promise<void>>()
    expectTypeOf<NitroRuntimeHooks['sitemap:sources']>()
      .toEqualTypeOf<(ctx: SitemapSourcesHookCtx) => void | Promise<void>>()
  })
})

describe('nitropack/types augmentations', () => {
  it('PrerenderRoute._sitemap is SitemapUrl', () => {
    expectTypeOf<PrerenderRouteTypes['_sitemap']>().toEqualTypeOf<SitemapUrl | undefined>()
  })

  it('NitroRouteRules.sitemap is SitemapItemDefaults | false', () => {
    expectTypeOf<NitroRouteRulesTypes['sitemap']>().toEqualTypeOf<SitemapItemDefaults | false | undefined>()
  })

  it('NitroRouteConfig.sitemap is SitemapItemDefaults | false', () => {
    expectTypeOf<NitroRouteConfigTypes['sitemap']>().toEqualTypeOf<SitemapItemDefaults | false | undefined>()
  })

  it('NitroRuntimeHooks has sitemap hooks', () => {
    expectTypeOf<NitroRuntimeHooksTypes['sitemap:resolved']>()
      .toEqualTypeOf<(ctx: SitemapRenderCtx) => void | Promise<void>>()
  })
})

describe('vue-router augmentations', () => {
  it('RouteMeta.sitemap is SitemapItemDefaults | false', () => {
    expectTypeOf<RouteMeta['sitemap']>().toEqualTypeOf<SitemapItemDefaults | false | undefined>()
  })
})

describe('#app augmentations', () => {
  it('PageMeta.sitemap is SitemapItemDefaults | false', () => {
    expectTypeOf<PageMeta['sitemap']>().toEqualTypeOf<SitemapItemDefaults | false | undefined>()
  })
})

describe('#sitemap-virtual/read-sources.mjs', () => {
  it('exports readSourcesFromFilesystem(filename: string) => Promise<any | null>', () => {
    expectTypeOf<typeof readSourcesFromFilesystem>().toBeFunction()
    expectTypeOf<typeof readSourcesFromFilesystem>().parameter(0).toBeString()
    expectTypeOf<typeof readSourcesFromFilesystem>().returns.toEqualTypeOf<Promise<any | null>>()
  })
})

describe('#sitemap-virtual/global-sources.mjs', () => {
  it('exports sources as (SitemapSourceBase | SitemapSourceResolved)[]', () => {
    expectTypeOf<typeof globalSources>().toEqualTypeOf<(SitemapSourceBase | SitemapSourceResolved)[]>()
  })
})

describe('#sitemap-virtual/child-sources.mjs', () => {
  it('exports sources as Record<string, (SitemapSourceBase | SitemapSourceResolved)[]>', () => {
    expectTypeOf<typeof childSources>().toEqualTypeOf<Record<string, (SitemapSourceBase | SitemapSourceResolved)[]>>()
  })
})
