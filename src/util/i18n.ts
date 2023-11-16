import type { AutoI18nConfig } from '../runtime/types'

export function splitPathForI18nLocales(path: string | RegExp, autoI18n: AutoI18nConfig) {
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
