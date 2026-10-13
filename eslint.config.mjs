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
  {
    // On Nuxt 4.6 with Nitro 2, these helpers run through Nuxt's core server module, which
    // imports app.config. That breaks `compatibilityVersion: 5` builds whose app.config calls
    // `defineAppConfig`.
    files: ['src/runtime/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'nuxt/server',
          importNames: ['getRequestHost', 'getRequestProtocol', 'getRequestURL', 'getRouterParam', 'getRouterParams', 'useAppConfig', 'getSession', 'useSession', 'updateSession', 'clearSession', 'getValidatedQuery', 'readValidatedBody'],
          message: 'It pulls app.config into the Nitro 2 server bundle. Use the helpers in src/runtime/server/request.ts.',
        }],
      }],
    },
  },
)
