export const CHUNK_SIZE = 5

export interface Game {
  id: number
  slug: string
  lastmod: string
}

// simulates a database that grows while the server is running
const games: Game[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  slug: `game-${i + 1}`,
  lastmod: new Date(Date.UTC(2024, 0, i + 1)).toISOString(),
}))

export function gamesInRange(range: number): Game[] {
  return games.filter(g => Math.floor((g.id - 1) / CHUNK_SIZE) === range)
}

export function gameChunkCount(): number {
  return Math.ceil(games.length / CHUNK_SIZE)
}

export function addGames(count: number): number {
  for (let i = 0; i < count; i++) {
    const id = games.length + 1
    games.push({
      id,
      slug: `game-${id}`,
      lastmod: new Date().toISOString(),
    })
  }
  return games.length
}
