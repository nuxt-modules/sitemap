import { defineEventHandler, useAppConfig } from 'nuxt/server'

export default defineEventHandler(event => ({ primary: useAppConfig(event).theme.primary }))
