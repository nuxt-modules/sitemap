import { createDefu } from 'defu'
import { withLeadingSlash } from 'ufo'

const merger = createDefu((obj, key, value) => {
  // merge arrays using a set
  if (Array.isArray(obj[key]) && Array.isArray(value))
    // @ts-expect-error untyped
    obj[key] = Array.from(new Set([...obj[key], ...value]))
  return obj[key]
})

export function mergeOnKey<T, K extends keyof T>(arr: T[], key: K) {
  const res: Record<string, T> = {}
  arr.forEach((item) => {
    const k = item[key] as string
    // @ts-expect-error untyped
    res[k] = merger(item, res[k] || {})
  })
  return Object.values(res)
}

export function splitForLocales(path: string, locales: string[]) {
  // we only want to use the first path segment otherwise we can end up turning "/ending" into "/en/ding"
  const prefix = withLeadingSlash(path).split('/')[1]
  // make sure prefix is a valid locale
  if (locales.includes(prefix))
    return [prefix, path.replace(`/${prefix}`, '')]
  return [null, path]
}
