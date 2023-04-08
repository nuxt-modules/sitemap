import { joinURL } from 'ufo'

export function urlWithBase(url: string, base: string, siteUrl: string) {
  return joinURL(siteUrl.replace(new RegExp(`${base}$`), ''), base, url.replace(new RegExp(`^${base}`), ''))
}
