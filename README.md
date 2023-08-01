<h1 align='center'>nuxt-simple-sitemap</h1>

<p align="center">
<a href='https://github.com/harlan-zw/nuxt-simple-sitemap/actions/workflows/test.yml'>
</a>
<a href="https://www.npmjs.com/package/nuxt-simple-sitemap" target="__blank"><img src="https://img.shields.io/npm/v/nuxt-simple-sitemap?style=flat&colorA=002438&colorB=28CF8D" alt="NPM version"></a>
<a href="https://www.npmjs.com/package/nuxt-simple-sitemap" target="__blank"><img alt="NPM Downloads" src="https://img.shields.io/npm/dm/nuxt-simple-sitemap?flat&colorA=002438&colorB=28CF8D"></a>
<a href="https://github.com/harlan-zw/nuxt-simple-sitemap" target="__blank"><img alt="GitHub stars" src="https://img.shields.io/github/stars/harlan-zw/nuxt-simple-sitemap?flat&colorA=002438&colorB=28CF8D"></a>
</p>


<p align="center">
Powerfully flexible XML Sitemaps that integrate seamlessly, for Nuxt.
</p>

<p align="center">
<table>
<tbody>
<td align="center">
<img width="800" height="0" /><br>
<i>Status:</i> <a href="https://github.com/harlan-zw/nuxt-simple-sitemap/releases/tag/v3.0.0">v3 Released 🎉</a></b> <br>
<sup> Please report any issues 🐛</sup><br>
<sub>Made possible by my <a href="https://github.com/sponsors/harlan-zw">Sponsor Program 💖</a><br> Follow me <a href="https://twitter.com/harlan_zw">@harlan_zw</a> 🐦 • Join <a href="https://discord.gg/275MBUBvgP">Discord</a> for help</sub><br>
<img width="800" height="0" />
</td>
</tbody>
</table>
</p>

## Features

- 📦 Single and Multi Sitemap support
- 🤝 Integrates seamlessly with Nuxt I18n and Nuxt Content
- 🤖 Dynamic runtime URL support with caching by default
- 🎨 Styled XML for easier debugging
- 😌 Automatic `lastmod`, image discovery and best practice URLS
- 🔄 Route config using route rules

## Installation

1. Install `nuxt-simple-sitemap` dependency to your project:

```bash
#
yarn add -D nuxt-simple-sitemap
#
npm install -D nuxt-simple-sitemap
#
pnpm i -D nuxt-simple-sitemap
```


2. Add it to your `modules` section in your `nuxt.config`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-simple-sitemap']
})
```

# Documentation

[📖 Read the full documentation](https://nuxtseo.com/sitemap) for more information.


### Demos

- [Dynamic URLs - StackBlitz](https://stackblitz.com/edit/nuxt-starter-dyraxc?file=server%2Fapi%2F_sitemap-urls.ts)
- [i18n - StackBlitz](https://stackblitz.com/edit/nuxt-starter-jwuie4?file=app.vue)

## Sponsors

<p align="center">
  <a href="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg">
    <img src='https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg'/>
  </a>
</p>


## License

MIT License © 2022-PRESENT [Harlan Wilton](https://github.com/harlan-zw)
