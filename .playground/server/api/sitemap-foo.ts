import { defineEventHandler } from 'h3'

export default defineEventHandler((e) => {
  return [
    '/foo/1',
    '/foo/2',
    '/foo/3',
  ]
})
