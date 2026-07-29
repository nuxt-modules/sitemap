import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  declaration: true,
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/parse/index', name: 'parse' },
    { input: 'src/fetch/index', name: 'fetch' },
  ],
  rollup: {
    emitCJS: false,
  },
})
