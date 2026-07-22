import { addTypeTemplate, hasNuxtModule } from '@nuxt/kit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerTypeTemplates } from './templates'

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

  it('registers augmentations in Nitro, node, and Nuxt contexts', () => {
    registerTypeTemplates()

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
  })
})
