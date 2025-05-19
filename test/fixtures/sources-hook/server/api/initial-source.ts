import { defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
  const headers = event.node.req.headers

  // Return different URLs based on whether headers were modified by hook
  if (headers['x-hook-modified'] === 'true') {
    return [
      { loc: '/hook-modified' },
    ]
  }

  return [
    { loc: '/initial-source-default' },
  ]
})
