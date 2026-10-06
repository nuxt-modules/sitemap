import { createError, defineEventHandler, getQuery, getRequestHeader } from 'nuxt/server'

export default defineEventHandler((event) => {
  if (getRequestHeader(event, 'authorization') !== 'Bearer fixture' || getQuery(event).locale !== 'en')
    throw createError({ status: 401, statusText: 'Source authorization failed' })
  return [{ loc: '/authenticated-source' }]
})
