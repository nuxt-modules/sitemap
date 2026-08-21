import { defineNitroPlugin } from 'nitropack/runtime'
import { chunkLastmod, gameChunkCount, MARKETS } from '../utils/games'

// Registers one sitemap per market chunk while the server is running. When the database
// grows past CHUNK_SIZE, the next request registers the new chunk automatically.
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sitemaps-resolved', ({ sitemaps }) => {
    for (const market of MARKETS) {
      for (let chunk = 0; chunk < gameChunkCount(); chunk++) {
        const name = `games-${market}-${chunk}`
        if (!(name in sitemaps)) {
          sitemaps[name] = {
            sitemapName: name,
            sources: [`/api/__sitemap__/games?market=${market}&chunk=${chunk}`],
          }
        }
      }
    }
  })

  // Stable per-chunk lastmod: the newest row inside that chunk's ID range
  nitroApp.hooks.hook('sitemap:index-resolved', ({ sitemaps: entries }) => {
    for (const entry of entries) {
      const match = entry._sitemapName?.match(/^games-[a-z]{2}-(\d+)$/)
      if (match)
        entry.lastmod = chunkLastmod(Number(match[1]))
    }
  })
})
