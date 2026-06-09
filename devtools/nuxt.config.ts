import { resolve } from 'pathe'

// Nuxt SEO devtools panel, shipped as a layer (Model C). Components flat-registered
// so intra-panel references resolve by name.
export default defineNuxtConfig({
  components: [{ path: resolve(__dirname, './components'), pathPrefix: false }],
})
