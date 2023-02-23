<h1 align='center'>nuxt-simple-sitemap</h1>

<p align="center">
<a href='https://github.com/harlan-zw/nuxt-simple-sitemap/actions/workflows/test.yml'>
</a>
<a href="https://www.npmjs.com/package/nuxt-simple-sitemap" target="__blank"><img src="https://img.shields.io/npm/v/nuxt-simple-sitemap?style=flat&colorA=002438&colorB=28CF8D" alt="NPM version"></a>
<a href="https://www.npmjs.com/package/nuxt-simple-sitemap" target="__blank"><img alt="NPM Downloads" src="https://img.shields.io/npm/dm/nuxt-simple-sitemap?flat&colorA=002438&colorB=28CF8D"></a>
<a href="https://github.com/harlan-zw/nuxt-simple-sitemap" target="__blank"><img alt="GitHub stars" src="https://img.shields.io/github/stars/harlan-zw/nuxt-simple-sitemap?flat&colorA=002438&colorB=28CF8D"></a>
</p>


<p align="center">
A simple sitemap.xml module for Nuxt 3.
</p>

<p align="center">
<table>
<tbody>
<td align="center">
<img width="800" height="0" /><br>
<i>Status:</i> <a href="https://github.com/harlan-zw/nuxt-simple-sitemap/releases/tag/v1.0.0">v1 Stable</a></b> <br>
<sup> Please report any issues 🐛</sup><br>
<sub>Made possible by my <a href="https://github.com/sponsors/harlan-zw">Sponsor Program 💖</a><br> Follow me <a href="https://twitter.com/harlan_zw">@harlan_zw</a> 🐦 • Join <a href="https://discord.gg/275MBUBvgP">Discord</a> for help</sub><br>
<img width="800" height="0" />
</td>
</tbody>
</table>
</p>

ℹ️ Looking for a complete SEO solution? Check out [Nuxt SEO Kit](https://github.com/harlan-zw/nuxt-seo-kit).

## Features

- 🪝 Minimal config, powerful API
- 🔄 Route config using route rules
- 🏞️ Handle trailing slashes 
- 📦 Uses [sitemap.js](https://github.com/ekalinin/sitemap.js)

## Install

```bash
npm install --save-dev nuxt-simple-sitemap

# Using yarn
yarn add --dev nuxt-simple-sitemap
```

## Setup

_nuxt.config.ts_

```ts
export default defineNuxtConfig({
  modules: [
    'nuxt-simple-sitemap',
  ],
})
```


### Set host

You'll need to provide the host of your site in order to generate the sitemap.xml.

```ts
export default defineNuxtConfig({
  // Recommended 
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://example.com',
    }
  },
  // OR 
  sitemap: {
    hostname: 'https://example.com',
  },
})
```

## Usage

### Handling dynamic routes

By default, all static routes are included within the sitemap.xml

To enable dynamic routes to be included, you can either manually provide them via the `urls` config or enable the Nitro crawler.

#### Automatic dynamic URLs - Recommended

If your dynamic links are linked on your site, you can enable the Nitro crawler to automatically include them.

This is recommended as having internal links for all your pages is a good practice for SEO.

```ts
export default defineNuxtConfig({
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: [
        '/',
      ]
    }
  }
})
```  


#### Manual dynamic URLs

```ts
export default defineNuxtConfig({
  sitemap: {
    // provide dynamic URLs to be included 
    urls: async () => {
      const blogPages = await getBlogPages()
      return blogPages.map((page) => ({
          url: `/blog/${page.slug}`,
          lastmod: page.updatedAt,
          changefreq: 'daily',
          priority: 0.8,
      }))
    },
  },
})
```


### Configure sitemap.xml entries

To change the behavior of sitemap.xml entries, you can use [Nitro route rules](https://nuxt.com/docs/api/configuration/nuxt-config/#routerules). 

_nuxt.config.ts_

```ts
export default defineNuxtConfig({
  routeRules: {
    // Don't add any /secret/** URLs to the sitemap.xml  
    '/secret/**': { index: false },
    // modify the sitemap.xml entry for specific URLs
    '/about': { sitemap: { changefreq: 'daily', priority: 0.3 } }
  }
})
```

See [sitemaps.org](https://www.sitemaps.org/protocol.html) for all available options.

## Previewing sitemap

In development, you can visit `/sitemap.preview.xml`.

If you're using the Nitro crawler, this sitemap.xml will only be a preview, as the dynamic URLs won't be resolved.

## Module Config

If you need further control over the sitemap.xml URLs, you can provide config on the `sitemap` key.

### `hostname`

- Type: `string`
- Default: `undefined`
- Required: `true`

The host of your site. This is required to generate the sitemap.xml. Example: https://example.com

### `trailingSlash`

- Type: `boolean`
- Default: `false`

Whether to add a trailing slash to the URLs in the sitemap.xml.

### `enabled`

- Type: `boolean`
- Default: `true`

Whether to generate the sitemap.xml.

### `defaults`

- Type: `object`
- Default: `{}`

Default values for the sitemap.xml entries. See [sitemaps.org](https://www.sitemaps.org/protocol.html) for all available options.

### `urls`

- Type: `() => MaybePromise<SitemapEntry[]> | MaybePromise<SitemapEntry[]>`
- Default: `[]`

Provide custom URLs to be included in the sitemap.xml.

### `include`

- Type: `string[]`
- Default: `['/**']`

Filter routes that match the given rules.

```ts
export default defineNuxtConfig({
  sitemap: {
    include: [
      '/my-hidden-url'
    ]
  }
})
```

### `exclude`

- Type: `string[]`
- Default: `undefined`

Filter routes that match the given rules.

```ts
export default defineNuxtConfig({
  sitemap: {
    exclude: [
        '/my-secret-section/**'
    ]
  }
})
```

Additional config extends [sitemap.js](https://github.com/ekalinin/sitemap.js).

### `devPreview`

- Type: `boolean`
- Default: `true`

Whether to generate the sitemap.xml preview in development.
It can be useful to disable if you have fetch requests to external APIs.

### `inferStaticPagesAsRoutes`

- Type: `boolean`
- Default: `true`

Will generate routes from your static page files. Useful to disable if you're using the i18n module with custom routes. 

## Examples

### Add custom routes without pre-rendering

```ts
export default defineNuxtConfig({
  hooks: {
      'sitemap:generate': (ctx) => {
          // add custom URLs
          ctx.urls.push({
              url: '/my-custom-url',
              changefreq: 'daily',
              priority: 0.3
          })
      }
  }
})
```

## Sponsors

<p align="center">
  <a href="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg">
    <img src='https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg'/>
  </a>
</p>


## License

MIT License © 2022-PRESENT [Harlan Wilton](https://github.com/harlan-zw)
