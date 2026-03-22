import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return Array.from({ length: 15 }, (_, i) => ({
    loc: `/dynamic/${i + 1}`,
    lastmod: new Date(2024, 0, i + 1).toISOString(),
  }))
})
