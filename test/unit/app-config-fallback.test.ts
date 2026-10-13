import { describe, expect, it } from 'vitest'
import { withDefineAppConfigFallback } from '../../src/utils-internal/appConfig'

// Run an app.config module body and return its default export.
function evaluate(source: string): unknown {
  // eslint-disable-next-line no-new-func
  return new Function(source.replace('export default', 'return'))()
}

describe('withDefineAppConfigFallback', () => {
  it('defines defineAppConfig for an auto-imported call', () => {
    const source = withDefineAppConfigFallback(`export default defineAppConfig({ theme: { primary: 'emerald' } })`, 'app.config.ts')
    expect(source).toBeDefined()
    expect(evaluate(source!)).toEqual({ theme: { primary: 'emerald' } })
  })

  it('leaves an explicit import alone', () => {
    const source = `import { defineAppConfig } from '#imports'\n\nexport default defineAppConfig({})`
    expect(withDefineAppConfigFallback(source, 'app.config.ts')).toBeUndefined()
  })

  it('leaves a local declaration alone', () => {
    const source = `const defineAppConfig = config => config\n\nexport default defineAppConfig({})`
    expect(withDefineAppConfigFallback(source, 'app.config.ts')).toBeUndefined()
  })

  it('leaves a plain object alone', () => {
    expect(withDefineAppConfigFallback(`export default { theme: {} }`, 'app.config.ts')).toBeUndefined()
  })
})
