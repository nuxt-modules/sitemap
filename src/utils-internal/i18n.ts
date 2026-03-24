import type { AutoI18nConfig } from 'nuxtseo-shared/i18n'
import type { FilterInput } from '../runtime/types'
import { splitPathForI18nLocales as _splitPathForI18nLocales } from 'nuxtseo-shared/i18n'

export { generatePathForI18nPages, normalizeLocales } from 'nuxtseo-shared/i18n'
export type { AutoI18nConfig, Strategies, StrategyProps } from 'nuxtseo-shared/i18n'

export function splitPathForI18nLocales(path: FilterInput, autoI18n: AutoI18nConfig): FilterInput | FilterInput[] {
  if (typeof path !== 'string')
    return path
  return _splitPathForI18nLocales(path, autoI18n)
}
