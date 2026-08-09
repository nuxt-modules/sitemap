import type { AutoI18nConfig } from 'nuxtseo-shared/i18n'
import type { FilterInput } from '../runtime/types'
import {
  mapPathForI18nPages as _mapPathForI18nPages,
  splitPathForI18nLocales as _splitPathForI18nLocales,
} from 'nuxtseo-shared/i18n'

export { expandCompactLocaleRoute, generatePathForI18nPages, mapPathForI18nPages, normalizeLocales } from 'nuxtseo-shared/i18n'

export function splitPathForI18nLocales(path: FilterInput, autoI18n: AutoI18nConfig): FilterInput | FilterInput[] {
  if (typeof path !== 'string')
    return path
  return _splitPathForI18nLocales(path, autoI18n)
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths)]
}

export function resolveI18nFilterPaths(path: FilterInput, autoI18n: AutoI18nConfig): FilterInput[] {
  if (typeof path !== 'string')
    return [path]

  const mappedPaths = _mapPathForI18nPages(path, autoI18n)
  if (mappedPaths === false) {
    if (autoI18n.strategy === 'no_prefix')
      return [path]
    const splitPaths = _splitPathForI18nLocales(path, autoI18n)
    return Array.isArray(splitPaths) ? splitPaths : [splitPaths]
  }

  if (autoI18n.strategy === 'prefix' || autoI18n.strategy === 'no_prefix')
    return uniquePaths(mappedPaths)

  const defaultLocales = autoI18n.locales.filter(locale => locale.code === autoI18n.defaultLocale)
  const defaultStrategy = autoI18n.strategy === 'prefix_and_default' ? 'prefix' : 'no_prefix'
  const defaultPaths = _mapPathForI18nPages(path, {
    ...autoI18n,
    locales: defaultLocales,
    strategy: defaultStrategy,
  })

  return uniquePaths([
    ...(defaultPaths || [path]),
    ...mappedPaths,
  ])
}
