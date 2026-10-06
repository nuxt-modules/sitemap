import { defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  setup(_options, nuxt) {
    nuxt.options.routeRules['/late'] = { headers: { 'x-robots-tag': 'noindex' } }
  },
})
