import { defineEventHandler, getQuery } from 'h3'
import { gamesInRange } from '../../utils/games'

export default defineEventHandler((event) => {
  const range = Number(getQuery(event).range || 0)
  return gamesInRange(range).map(g => ({
    loc: `/game/${g.id}/${g.slug}`,
    lastmod: g.lastmod,
  }))
})
