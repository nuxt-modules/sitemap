const enableSitemap = process.env.BENCH_SITEMAP === '1'
const enableWarmUp = process.env.BENCH_WARMUP !== '0'
const enableXsl = process.env.BENCH_XSL !== '0'
const zeroRuntime = process.env.BENCH_ZERO === '1'
const slug = process.env.BENCH_SLUG || 'default'

console.log(`[bench/nuxt.config] sitemap=${enableSitemap} warm=${enableWarmUp} xsl=${enableXsl} zero=${zeroRuntime} slug=${slug}`)

export default defineNuxtConfig({
  modules: [
    ...(enableSitemap ? ['../src/module'] : []),
    (_options: any, nuxt: any) => {
      nuxt.hook('modules:done', () => {
        const names = nuxt.options._installedModules.map((m: any) => m?.meta?.name || m?.entryPath || '?')
        console.log(`[bench] installed modules (${names.length}): ${JSON.stringify(names)}`)
      })
    },
  ] as any,

  site: {
    url: 'https://example.com',
  },

  sitemap: {
    enabled: enableSitemap,
    excludeAppSources: true,
    debug: false,
    sitemapsPathPrefix: '/',
    discoverImages: false,
    discoverVideos: false,
    experimentalWarmUp: enableWarmUp,
    xsl: enableXsl ? '/__sitemap__/style.xsl' : false,
    zeroRuntime,
    autoI18n: false,
    cacheMaxAgeSeconds: 36000,
  },

  compatibilityDate: '2025-01-01',

  buildDir: `.nuxt-${slug}`,

  nitro: {
    preset: 'node-server',
    output: {
      dir: `.output-${slug}`,
    },
  },
})
