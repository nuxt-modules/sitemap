import antfu from '@antfu/eslint-config'
import harlanzw from 'eslint-plugin-harlanzw'

export default antfu(
  {
    type: 'lib',
    vue: true,
  },
  ...harlanzw({
    // base covers fixtures and playground; docs is its own Nuxt Content site
    base: { ignores: ['docs/**', 'benchmark/**'] },
    link: true,
    nuxt: true,
    vue: true,
  }),
  {
    // module and Nitro code, so a `useX` name is not a Vue composable
    files: ['**/server/**/*.ts', '**/src/**/*.ts'],
    rules: {
      'harlanzw/vue-no-faux-composables': 'off',
    },
  },
)
