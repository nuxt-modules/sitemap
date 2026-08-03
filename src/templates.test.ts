import { addTypeTemplate, hasNuxtModule } from '@nuxt/kit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerTypeTemplates } from './templates'

const nitroCompatibility = {
  _tag: 'nitro-v2',
  eventContextModule: 'h3',
  eventContextType: 'H3EventContext',
  eventType: `import('h3').H3Event`,
  nitroTypesModule: 'nitropack',
} as const

const nitro3Compatibility = {
  _tag: 'nitro-v3',
  eventContextModule: 'srvx',
  eventContextType: 'ServerRequestContext',
  eventType: `import('nitro/h3').H3Event`,
  nitroTypesModule: 'nitro/types',
} as const

vi.mock('@nuxt/kit', () => ({
  addTemplate: vi.fn(),
  addTypeTemplate: vi.fn(),
  hasNuxtModule: vi.fn(),
}))

describe('registerTypeTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(hasNuxtModule).mockReturnValue(false)
  })

  it('registers augmentations in Nitro, node, and Nuxt contexts', async () => {
    registerTypeTemplates(nitroCompatibility)

    expect(addTypeTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'types/nuxt-sitemap-augments.d.ts',
      }),
      {
        nitro: true,
        node: true,
        nuxt: true,
      },
    )

    const template = vi.mocked(addTypeTemplate).mock.calls.map(([template]) => template).find(template => template.filename === 'types/nuxt-sitemap-augments.d.ts')
    const contents = await template?.getContents?.({} as never)

    expect(contents).toContain('declare module \'nitropack\'')
    expect(contents).toContain('declare module \'nitropack/types\'')
    expect(contents?.match(/interface PrerenderRoute/g)).toHaveLength(2)
  })

  it('targets Nitro 3 public type modules', () => {
    registerTypeTemplates(nitro3Compatibility)

    const template = vi.mocked(addTypeTemplate).mock.calls.map(([template]) => template).find(template => template.filename === 'types/nuxt-sitemap-augments.d.ts')
    const contents = template?.getContents?.({} as never)

    expect(contents).toContain('declare module \'nitro/types\'')
    expect(contents).toContain('import(\'nitro/h3\').H3Event')
    expect(contents).toContain('interface PrerenderRoute')
    expect(contents).not.toContain('declare module \'nitropack/types\'')
  })
})
