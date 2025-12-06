<h1>@nuxtjs/sitemap</h1>

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Nuxt Sitemap is a module for generating best-practice XML sitemaps that are consumed by the robots crawling your site.

New to XML sitemaps or SEO? Check out the [Controlling Web Crawlers](https://nuxtseo.com/learn/controlling-crawlers) guide to learn more about why you might
need these.

<p align="center">
<table>
<tbody>
<td align="center">
<sub>Made possible by my <a href="https://github.com/sponsors/harlan-zw">Sponsor Program 💖</a><br> Follow me <a href="https://twitter.com/harlan_zw">@harlan_zw</a> 🐦 • Join <a href="https://discord.gg/275MBUBvgP">Discord</a> for help</sub><br>
</td>
</tbody>
</table>
</p>

## Features

- 🌴 Single `/sitemap.xml` or multiple `/posts-sitemap.xml`, `/pages-sitemap.xml`
- 📊 Fetch your sitemap URLs from anywhere
- 😌 Automatic `lastmod`, image discovery and best practice sitemaps
- 🔄 SWR caching, route rules support
- 🎨 Debug using the Nuxt DevTools integration or the XML Stylesheet
- 🤝 Integrates seamlessly with [Nuxt I18n](https://github.com/nuxt-modules/i18n) and [Nuxt Content](https://github.com/nuxt/content)

## Installation

💡 Using Nuxt 2? Use the [nuxt-community/sitemap-module](https://github.com/nuxt-community/sitemap-module) docs.

Install `@nuxtjs/sitemap` dependency to your project:

```bash
npx nuxi@latest module add sitemap
```

💡 Need a complete SEO solution for Nuxt? Check out [Nuxt SEO](https://nuxtseo.com).

## Documentation

[📖 Read the full documentation](https://nuxtseo.com/sitemap) for more information.

## Demos

- [Dynamic URLs](https://stackblitz.com/edit/nuxt-starter-dyraxc?file=server%2Fapi%2F_sitemap-urls.ts)
- [i18n](https://stackblitz.com/edit/nuxt-starter-jwuie4?file=app.vue)
- [Manual Chunking](https://stackblitz.com/edit/nuxt-starter-umyso3?file=nuxt.config.ts)
- [Nuxt Content Document Driven](https://stackblitz.com/edit/nuxt-starter-a5qk3s?file=nuxt.config.ts)

## Sponsors

<p align="center">
  <a href="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg">
    <img src='https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg'/>
  </a>
</p>

## License

Licensed under the [MIT license](https://github.com/nuxt-modules/sitemap/blob/main/LICENSE.md).

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@nuxtjs/sitemap/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@nuxtjs/sitemap

[npm-downloads-src]: https://img.shields.io/npm/dm/@nuxtjs/sitemap.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@nuxtjs/sitemap

[license-src]: https://img.shields.io/github/license/nuxt-modules/sitemap.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/nuxt-modules/sitemap/blob/main/LICENSE.md

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt
[nuxt-href]: https://nuxt.com
