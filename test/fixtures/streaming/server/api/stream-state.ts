import { defineEventHandler } from 'h3'
import { getStreamState } from '../utils/stream-state'

export default defineEventHandler(() => getStreamState())
