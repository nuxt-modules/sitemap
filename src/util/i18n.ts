import type { NuxtI18nOptions } from '@nuxtjs/i18n/dist/module'
import type { Strategies } from 'vue-i18n-routing'
import { joinURL } from 'ufo'
import type { AutoI18nConfig, FilterInput } from '../runtime/types'

export interface StrategyProps {
  localeCode: string
  pageLocales: string
  nuxtI18nConfig: NuxtI18nOptions
  forcedStrategy?: Strategies
}

export function splitPathForI18nLocales(path: FilterInput, autoI18n: AutoI18nConfig) {
  const locales = autoI18n.strategy === 'prefix_except_default' ? autoI18n.locales.filter(l => l.code !== autoI18n.defaultLocale) : autoI18n.locales
  if (typeof path !== 'string' || path.startsWith('/api') || path.startsWith('/_nuxt'))
    return path
  const match = path.match(new RegExp(`^/(${locales.map(l => l.code).join('|')})(.*)`))
  const locale = match?.[1]
  // only accept paths without locale
  if (locale)
    return path
  return [
    path,
    ...locales.map(l => `/${l.code}${path}`),
  ]
}

export function generatePathForI18nPages({ localeCode, pageLocales, nuxtI18nConfig, forcedStrategy }: StrategyProps): string {
  switch (forcedStrategy ?? nuxtI18nConfig.strategy) {
    case 'prefix_except_default':
    case 'prefix_and_default':
      return localeCode === nuxtI18nConfig.defaultLocale ? pageLocales : joinURL(localeCode, pageLocales)
    case 'prefix':
      return joinURL(localeCode, pageLocales)
    case 'no_prefix':
    default:
      return pageLocales
  }
}
