import { fileURLToPath } from 'node:url'
import { $fetch, getBrowser, setup, url, useTestContext } from '@nuxt/test-utils'
import { expect } from 'vitest'
import { load } from 'cheerio'
import type { Page } from 'playwright'

export async function $fetchPath(path: string) {
  const html = await $fetch(path)
  return load(html as string)
}

export async function renderPage(path = '/') {
  const ctx = useTestContext()
  if (!ctx.options.browser)
    return

  const browser = await getBrowser()
  const page = await browser.newPage({
  })
  const pageErrors: any = []
  const consoleLogs: any = []

  page.on('console', (message: any) => {
    consoleLogs.push({
      type: message.type(),
      text: message.text(),
    })
  })
  page.on('pageerror', (err: any) => {
    pageErrors.push(err)
  })

  if (path)
    await page.goto(url(path), { waitUntil: 'networkidle' })

  return <any> {
    page,
    pageErrors,
    consoleLogs,
  }
}

export async function expectNoClientErrors(path: string) {
  const ctx = useTestContext()
  if (!ctx.options.browser)
    return

  const { pageErrors, consoleLogs, page } = await renderPage(path)

  const consoleLogErrors = consoleLogs.filter((i: any) => i.type === 'error')
  const consoleLogWarnings = consoleLogs.filter((i: any) => i.type === 'warning')

  expect(pageErrors).toEqual([])
  expect(consoleLogErrors).toEqual([])
  expect(consoleLogWarnings).toEqual([])

  await page.close()
}

export function setupTestSSR(config: any = {}) {
  return setup({
    rootDir: fileURLToPath(new URL('../playground', import.meta.url)),
    server: true,
    browser: false,
    ...config,
    nuxtConfig: {
      head: {
        seoOptimise: false,
      },
      ...config.nuxtConfig,
    },
  })
}

export function setupTestCSR(config: any = {}) {
  return setup({
    rootDir: fileURLToPath(new URL('../playground', import.meta.url)),
    server: true,
    browser: true,
    browserOptions: {
      type: 'chromium',
      launch: {
        timeout: 30000,
      },
    },
    ...config,
    nuxtConfig: {
      // ensure we're testing the client-side hydration
      ssr: false,
      head: {
        seoOptimise: false,
      },
      ...config.nuxtConfig,
    },
  })
}

export async function queryHeadState(page: Page, wait?: boolean) {
  const htmlAttrs = await page.evaluate('[...document.children[0].attributes].map(f => ({ name: f.name, value: f.value }))')
  const bodyAttrs = await page.evaluate('[...document.querySelector(\'body\').attributes].map(f => ({ name: f.name, value: f.value }))')
  const title = await page.title()
  const $headCount = await page.evaluate('document.querySelector(\'meta[name="head:count"]\')')
  let headTagCount = 0
  let headTagIdx = 0
  if ($headCount) {
    headTagCount = Number.parseInt(await page.evaluate('document.querySelector(\'meta[name="head:count"]\')?.getAttribute(\'content\')'))
    headTagIdx = Number.parseInt(await page.evaluate('[...document.head.children].indexOf(document.querySelector(\'meta[name="head:count"]\'))')) - 1
  }
  const bodyTags = await page.evaluate('document.querySelectorAll(\'[data-meta-body]\')')
  let headTags = await page.evaluate('[...document.head.querySelectorAll(\'meta, script, link, noscript, style\').entries()].map(([k, v]) => v.outerHTML)')

  // only the x before the head tag count
  headTags = Object.entries(headTags).map(([key, value]) => {
    const idx = Number.parseInt(key)
    if (idx >= headTagIdx - headTagCount && idx < headTagIdx)
      return value
    return false
  }).filter(Boolean)

  return {
    headTagCount,
    title,
    headTags,
    bodyTags,
    htmlAttrs,
    bodyAttrs,
  }
}
