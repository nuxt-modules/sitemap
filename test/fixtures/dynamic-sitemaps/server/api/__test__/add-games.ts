import { defineEventHandler, readBody } from 'h3'
import { addGames } from '../../utils/games'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ count?: number }>(event).catch(() => ({}) as { count?: number })
  return { total: addGames(Number(body?.count) || 1) }
})
