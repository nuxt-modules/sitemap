import { defineEventHandler, setHeader } from 'h3'
import { generateXslStylesheet } from '../util/builder'

export default defineEventHandler(async (e) => {
  setHeader(e, 'Content-Type', 'application/xslt+xml')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  return generateXslStylesheet()
})
