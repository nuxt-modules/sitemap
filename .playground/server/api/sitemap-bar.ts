import { defineEventHandler } from 'h3'

export default defineEventHandler((e) => {
  return [
    '/bar/1',
    '/bar/2',
    '/bar/3',
  ]
})
