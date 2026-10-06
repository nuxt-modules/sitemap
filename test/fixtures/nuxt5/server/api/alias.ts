import { asSitemapUrl, defineSitemapEventHandler } from '#sitemap/server'
import { getSiteConfig } from '#site-config/server'

export default defineSitemapEventHandler(event => [asSitemapUrl({ loc: getSiteConfig(event).url + '/alias-proof' })])
