import { defineSitemapEventHandler } from '#sitemap/server'

export default defineSitemapEventHandler(async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
  return {
    skip: 120_000,
  }
})
