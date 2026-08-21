import { getQuery } from 'h3'
import { gamesForChunk } from '../../utils/games'

// One source endpoint serves every chunk. Query params decide which slice to return.
// Chunk boundaries are ID ranges from the database, so they never shift when rows are deleted.
export default defineSitemapEventHandler((event) => {
  const { market, chunk } = getQuery(event)
  return gamesForChunk(Number(chunk), String(market))
})
