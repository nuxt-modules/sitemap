export const CHUNK_SIZE = 5000

export const MARKETS = ['us', 'gb', 'de', 'fr'] as const

// Stand-in for your database. In a real app query the totals and ranges from your DB.
// Chunk keys are stable ID ranges: deleting a game never shifts later chunks.
const games = Array.from({ length: 12000 }, (_, i) => ({
  id: i + 1,
  slug: `game-${i + 1}`,
  lastmod: new Date(Date.UTC(2024, 0, 1 + Math.floor(i / 100))).toISOString(),
}))

export function gameChunkCount(): number {
  return Math.ceil(games.length / CHUNK_SIZE)
}

export function gamesForChunk(chunk: number, market: string) {
  const start = chunk * CHUNK_SIZE
  return games
    .filter((_, i) => i >= start && i < start + CHUNK_SIZE)
    .map(g => ({
      loc: `/${market}/game/${g.id}/${g.slug}`,
      lastmod: g.lastmod,
      alternatives: MARKETS.map(m => ({
        hreflang: `en-${m.toUpperCase()}`,
        href: `/${m}/game/${g.id}/${g.slug}`,
      })),
    }))
}

// The most recent lastmod within one chunk, so the index reflects real content changes
export function chunkLastmod(chunk: number): string | undefined {
  const start = chunk * CHUNK_SIZE
  const slice = games.slice(start, start + CHUNK_SIZE)
  return slice.at(-1)?.lastmod
}
