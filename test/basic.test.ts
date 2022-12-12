import { describe, expect, it } from 'vitest'
import { $fetchPath, setupTestSSR } from '../utils'

await setupTestSSR()

describe('pages', () => {
  it('render index', async () => {
    const $ = await $fetchPath('/')
    const metaTags = $('head > meta').toArray()
    expect(metaTags).toMatchInlineSnapshot(`
      [
        <meta
          charset="utf-8"
        />,
        <meta
          content="width=device-width, initial-scale=1"
          name="viewport"
        />,
        <meta
          content="My site description"
          name="description"
        />,
        <meta
          content="https://nuxtjs.org/meta_400.png"
          property="og:image"
        />,
        <meta
          content="description"
          data-h-71bc24a=""
          name="description"
        />,
      ]
    `)
  })
})
