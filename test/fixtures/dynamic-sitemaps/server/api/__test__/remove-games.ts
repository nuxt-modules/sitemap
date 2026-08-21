import { defineEventHandler, readBody } from 'h3'
import { removeGames } from '../../utils/games'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ count?: number }>(event).catch(() => ({}) as { count?: number })
  return { total: removeGames(Number(body?.count) || 1) }
})
