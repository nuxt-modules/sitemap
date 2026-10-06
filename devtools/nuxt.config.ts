import { resolve } from 'node:path'

const currentDir = import.meta.dirname

// Nuxt SEO devtools panel, shipped as a layer (Model C). Components flat-registered
// so intra-panel references resolve by name.
export default defineNuxtConfig({
  components: [{ path: resolve(currentDir, './components'), pathPrefix: false }],
})
