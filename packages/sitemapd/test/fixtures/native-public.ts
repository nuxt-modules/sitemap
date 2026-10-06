import { collectSitemap } from 'sitemapd/parse'

const result = await collectSitemap('<urlset><url><loc>https://example.com/native</loc></url></urlset>')
console.log(JSON.stringify(result))
