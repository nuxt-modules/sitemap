import type { NuxtI18nOptions } from '@nuxtjs/i18n/dist/module'
import type { Strategies } from 'vue-i18n-routing'
import { joinURL } from 'ufo'
import type { AutoI18nConfig, FilterInput } from '../runtime/types'
import { splitForLocales } from '../runtime/utils-pure'

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
  const match = splitForLocales(path, locales.map(l => l.code))
  const locale = match[0]
  // only accept paths without locale
  if (locale)
    return path
  return [
    path,
    ...locales.map(l => `/${l.code}${path}`),
  ]
}

export function generatePathForI18nPages({ localeCode, pageLocales, nuxtI18nConfig, forcedStrategy }: StrategyProps): string {
  // If the locale has a different domain, prioritize that
  let basePageLocale = pageLocales
  if (nuxtI18nConfig.differentDomains && nuxtI18nConfig.locales){
    const domainLocale = nuxtI18nConfig?.locales.find(e => {
      if(typeof e === 'string') return false
      return [e.iso, e.code].includes(localeCode) && e.domain ? e.domain : false
    }) as string
    
    if(domainLocale) basePageLocale = domainLocale
    }

  switch (forcedStrategy ?? nuxtI18nConfig.strategy) {
    case 'prefix_except_default':
    case 'prefix_and_default':
      return (localeCode === nuxtI18nConfig.defaultLocale ? basePageLocale : joinURL(localeCode, basePageLocale))
    case 'prefix':
      return joinURL(localeCode, basePageLocale)
    case 'no_prefix':
    default:
      return basePageLocale
  }
}
