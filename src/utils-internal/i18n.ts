import type { NuxtI18nOptions, LocaleObject } from '@nuxtjs/i18n'
import type { Strategies } from 'vue-i18n-routing'
import { joinURL, withBase, withHttps } from 'ufo'
import type { AutoI18nConfig, FilterInput } from '../runtime/types'
import { mergeOnKey, splitForLocales } from '../runtime/utils-pure'

export interface StrategyProps {
  localeCode: string
  pageLocales: string
  nuxtI18nConfig: NuxtI18nOptions
  forcedStrategy?: Strategies
  normalisedLocales: AutoI18nConfig['locales']
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

export function normalizeLocales(nuxtI18nConfig: NuxtI18nOptions): AutoI18nConfig['locales'] {
  let locales = nuxtI18nConfig.locales || []
  let onlyLocales = nuxtI18nConfig?.bundle?.onlyLocales || []
  onlyLocales = typeof onlyLocales === 'string' ? [onlyLocales] : onlyLocales
  locales = mergeOnKey(locales.map((locale: any) => typeof locale === 'string' ? { code: locale } : locale), 'code')
  if (onlyLocales.length) {
    locales = locales.filter((locale: LocaleObject) => onlyLocales.includes(locale.code))
  }
  return locales.map((locale) => {
    // we prefer i18n v9 config
    if (locale.iso && !locale.language) {
      locale.language = locale.iso
    }
    locale._hreflang = locale.language || locale.code
    locale._sitemap = locale.language || locale.code
    return locale
  })
}
