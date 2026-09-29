import { defineEventHandler } from 'h3'

// One URL per chunk, more chunks than the old limit of 20 pre-registered routes.
export default defineEventHandler(() => {
  return Array.from({ length: 25 }, (_, i) => ({
    loc: `/many/${i + 1}`,
  }))
})
