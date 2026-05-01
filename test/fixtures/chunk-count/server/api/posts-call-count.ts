import { defineEventHandler } from 'h3'

export default defineEventHandler(() => ({ count: globalThis.__chunkCountPostsCalls ?? 0 }))
