import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    { input: 'src/content', name: 'content' },
    { input: 'src/utils', name: 'utils' },
  ],
  externals: [
    // needed for content subpath export
    '@nuxt/content',
    'zod',
  ],
})
