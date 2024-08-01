import type { NuxtI18nOptions } from '@nuxtjs/i18n'
import type { Strategies } from 'vue-i18n-routing'
import { joinURL, withBase, withHttps } from 'ufo'
import type { AutoI18nConfig, FilterInput, NormalisedLocales } from '../runtime/types'
import { splitForLocales } from '../runtime/utils-pure'

export interface StrategyProps {
  localeCode: string
  pageLocales: string
  nuxtI18nConfig: NuxtI18nOptions
  forcedStrategy?: Strategies
  normalisedLocales: NormalisedLocales
}

export function splitPathForI18nLocales(path: FilterInput, autoI18n: AutoI18nConfig) {
  const locales = autoI18n.strategy === 'prefix_except_default' ? autoI18n.locales.filter(l => l.code !== autoI18n.defaultLocale) : autoI18n.locales
  if (typeof path !== 'string' || path.startsWith('/_'))
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

export function getExcludedLocalesFromI18nConfig(nuxtI18nConfig: NuxtI18nOptions) {
  const onlyLocales = nuxtI18nConfig?.bundle?.onlyLocales
  if (!onlyLocales) return []
  const excludedLocales = typeof onlyLocales === 'string' ? [onlyLocales] : onlyLocales
  return excludedLocales
}

export function generatePathForI18nPages(ctx: StrategyProps): string {
  const { localeCode, pageLocales, nuxtI18nConfig, forcedStrategy, normalisedLocales } = ctx
  const locale = normalisedLocales.find(l => l.code === localeCode)
  let path = pageLocales
  switch (forcedStrategy ?? nuxtI18nConfig.strategy) {
    case 'prefix_except_default':
    case 'prefix_and_default':
      path = localeCode === nuxtI18nConfig.defaultLocale ? pageLocales : joinURL(localeCode, pageLocales)
      break
    case 'prefix':
      path = joinURL(localeCode, pageLocales)
      break
  }
  return locale?.domain ? withHttps(withBase(path, locale.domain)) : path
}
