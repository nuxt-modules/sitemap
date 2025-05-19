import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return [
    { loc: '/dynamic-source-url' },
  ]
})
