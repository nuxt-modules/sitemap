import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    { input: 'src/content', name: 'content' },
    { input: 'src/utils', name: 'utils' },
  ],
  externals: [
    // Nuxt core
    'nuxt',
    'nuxt/schema',
    '@nuxt/kit',
    '@nuxt/schema',
    'nitropack',
    'nitropack/types',
    'h3',
    // Vue
    'vue',
    'vue-router',
    '@vue/runtime-core',
    // Common deps
    '#imports',
    // Content subpath export
    '@nuxt/content',
    'zod',
  ],
})
