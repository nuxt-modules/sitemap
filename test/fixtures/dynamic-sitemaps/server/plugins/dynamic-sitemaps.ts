import { defineNitroPlugin } from 'nitropack/runtime'
import { gameChunkCount, gamesInRange } from '../utils/games'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sitemaps-resolved', ({ sitemaps }) => {
    for (let range = 0; range < gameChunkCount(); range++) {
      const name = `games-${range}`
      if (!(name in sitemaps)) {
        sitemaps[name] = {
          sitemapName: name,
          sources: [`/api/__sitemap__/games?range=${range}`],
        }
      }
    }
  })

  // reliable per-chunk lastmod: the most recent game in each chunk
  nitroApp.hooks.hook('sitemap:index-resolved', ({ sitemaps: entries }) => {
    for (const entry of entries) {
      if (!entry._sitemapName?.startsWith('games-'))
        continue
      const range = Number(entry._sitemapName.split('-')[1])
      const lastmods = gamesInRange(range).map(g => g.lastmod).sort()
      if (lastmods.length)
        entry.lastmod = lastmods[lastmods.length - 1]
    }
  })
})
