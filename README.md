<h1 align='center'>nuxt-simple-sitemap</h1>

<p align="center">
<a href='https://github.com/harlan-zw/nuxt-simple-sitemap/actions/workflows/test.yml'>
</a>
<a href="https://www.npmjs.com/package/nuxt-simple-sitemap" target="__blank"><img src="https://img.shields.io/npm/v/nuxt-simple-sitemap?style=flat&colorA=002438&colorB=28CF8D" alt="NPM version"></a>
<a href="https://www.npmjs.com/package/nuxt-simple-sitemap" target="__blank"><img alt="NPM Downloads" src="https://img.shields.io/npm/dm/nuxt-simple-sitemap?flat&colorA=002438&colorB=28CF8D"></a>
<a href="https://github.com/harlan-zw/nuxt-simple-sitemap" target="__blank"><img alt="GitHub stars" src="https://img.shields.io/github/stars/harlan-zw/nuxt-simple-sitemap?flat&colorA=002438&colorB=28CF8D"></a>
</p>


<p align="center">
The simplest way to add XML Sitemaps to your Nuxt 3 site.
</p>

<p align="center">
<table>
<tbody>
<td align="center">
<img width="800" height="0" /><br>
<i>Status:</i> <a href="https://github.com/harlan-zw/nuxt-simple-sitemap/releases/tag/v2.0.0">v2 Released 🎉</a></b> <br>
<sup> Please report any issues 🐛</sup><br>
<sub>Made possible by my <a href="https://github.com/sponsors/harlan-zw">Sponsor Program 💖</a><br> Follow me <a href="https://twitter.com/harlan_zw">@harlan_zw</a> 🐦 • Join <a href="https://discord.gg/275MBUBvgP">Discord</a> for help</sub><br>
<img width="800" height="0" />
</td>
</tbody>
</table>
</p>

ℹ️ Looking for a complete SEO solution? Check out [Nuxt SEO Kit](https://github.com/harlan-zw/nuxt-seo-kit).

## Features

- 📦 Multi-sitemap support (automatic and manual chunking)
- 🤖 Dynamic runtime URL support
- 🎨 Styled XML for easier debugging
- 😌 Automatic lastmod and image discovery
- 🔄 Route config using route rules
- 🏞️ Handle trailing slashes

### Zero Config Integrations

- [`@nuxt/content` documentDriven mode](https://content.nuxtjs.org/guide/writing/document-driven)

Will generate `lastmod` from last time a document was updated, images are included from any `<img>` tags

- [`nuxt-simple-robots`](https://github.com/harlan-zw/nuxt-simple-robots)

Sitemap entries will be included automatically.

- [`@nuxtjs/i18n`](https://github.com/nuxt-modules/i18n)

Will automatically add `hreflang` alternatives for each non-default locale.

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
    siteUrl: 'https://example.com',
  },
})
```

## How it works

This module has been built to provide as simple of configuration as possible. 

To do this, it collects all possible sitemap URLs from the following sources:
- All files in the pages directory match routes (can be disabled with `inferStaticPagesAsRoutes: false`)
- Prerendered routes (see [Zero Config Prerendering](#zero-config-prerendering-optional))
- User provided dynamic routes (see [Handling dynamic URLs](#handling-dynamic-urls))

It then will filter these URLs based on the following rules:
- Module Config / Sitemap Entry: `exclude` - Array of glob patterns to exclude from the sitemap
- Module Config / Sitemap Entry: `include` - Array of glob patterns to include in the sitemap
- Route Rules: `index` - Whether a specific page can be indexed, not indexable pages are excluded from the sitemap

## Usage

### Zero Config Prerendering (optional)

While not required, this module is simplest to use when full prerendering is enabled,
as it will automatically discover all prerendered routes.

For each discovered prerendered route it will auto-discover all pages `<image:image>` entries as well as the `lastmod` date
(when `autoLastmod` isn't disabled).

To ensure images are discovered for the sitemap, make sure you main site content is wrapped with a `<main>` tag.

You can make sure this behaviour is enabled with the following config:

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

### Multiple Sitemap Support

By default, the sitemap module will generate a single sitemap.xml file.

If you want to generate multiple sitemaps, you can use the `sitemaps` option.

- Automatic Chunking: `true`

This will automatically chunk your sitemap into multiple-sitemaps for every 1000 URLs, using the `0-sitemap.xml`, `1-sitemap.xml` naming convention.

You should avoid using this if you have less than 1000 URLs.

```ts
export default defineNuxtConfig({
  sitemap: {
    // automatically chunk into multiple sitemaps
    sitemaps: true,
  },
})
```

- Manual chunking

You can manually chunk your sitemap into multiple sitemaps by providing filter options.

```ts
export default defineNuxtConfig({
  sitemap: {
    // manually chunk into multiple sitemaps
    sitemaps: {
      posts: {
        include: [
          '/blog/**',
        ],
        // example: give blog posts slightly higher priority (this is optional)
        defaults: { priority: 0.7 },
      },
      pages: {
        exclude: [
          '/blog/**',
        ]
      },
    },
  },
})
```

For each sitemaps entry, you can provide the following options:

- `include` - Array of glob patterns to include in the sitemap
- `exclude` - Array of glob patterns to exclude from the sitemap
- `defaults` - Sitemap default values such as `lastmod, `changefreq`, `priority`
- `urls` - Array of static URLs to include in the sitemap. You should avoid using this option if you have a lot of URLs, instead see below [Handling dynamic URLs](#handling-dynamic-urls)

### Handling dynamic URLs

For Nuxt apps where all the pages aren't prerendered,
you may want to provide the list of dynamic routes to be included in the sitemap.xml.

The recommended approach is to create your own api endpoint that returns the list of all dynamic routes.

To do so, create the file `server/api/_sitemap-urls.ts`.

```ts
export default cachedEventHandler(async e => {
  const [
    posts,
    pages,
    products
  ] = await Promise.all([
    $fetch('/api/posts'),
    $fetch('/api/pages'),
    $fetch('/api/products')
  ])
  return [...posts, ...pages, ...products].map(p => { loc: p.url, lastmod: p.updatedAt })
}, {
  name: 'sitemap-dynamic-urls',
  maxAge: 60 * 10 // cache URLs for 10 minutes
})
```

This API endpoint will automatically be called by the sitemap module to fetch the list of dynamic URLs whenever a sitemap is generated.

While not required, it's recommended to use the `cacheEventHandler` and set an appropriate `maxAge`, 10 minutes is a good default.

#### Start-time dynamic URLs

If you prefer a simpler config, you can provide the dynamic URLs at start-time using the `urls` config.
Note that this approach may not be suitable for large sites.

```ts
export default defineNuxtConfig({
  sitemap: {
    // provide dynamic URLs to be included 
    urls: async () => {
      const blogPages = await getBlogPages()
      return blogPages.map((page) => ({
          loc: `/blog/${page.slug}`,
          lastmod: page.updatedAt,
          changefreq: 'daily',
          priority: 0.8,
      }))
    },
  },
})
```

### Auto Lastmod

By default, the sitemap module will automatically detect the `lastmod` date for each URL.

This is done by looking at the `mtime` of the page file associated with a route. 

If a route can't be associated with a page file then the current date will be used.

You can disable this behaviour by setting `autoLastmod: false`.

```ts
export default defineNuxtConfig({
  sitemap: {
    autoLastmod: false,
  },
})
```

### Route Rules Config

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


## Sitemap Entry Schema

The sitemap entry schema mostly follows the [sitemap specification](https://www.sitemaps.org/protocol.html), the following options are supported:

- `loc` - URL of the page.
- `lastmod` - The date of last modification of the file
- `changefreq` - How frequently the page is likely to change.
- `priority` - The priority of this URL relative to other URLs on your site.
- `images` - An array of images to include in the sitemap entry as `<image:image>`.
- `video` - An array of videos to include in the sitemap entry as `<video:video>`.
- `news` - An array of news to include in the sitemap entry as `<news:news>`.
- `alternatives` - An array of alternatives to include in the sitemap entry as `<xhtml:link rel="alternate" ...>`.

## Nuxt Hooks

### `sitemap:prerender`

**Type:** `async (ctx: { urls: SitemapConfig; sitemapName: string }) => void | Promise<void>`

This hook allows you to modify the sitemap(s) urls when they're prerendered.

Note: For dynamic runtime sitemaps this hook won't do anything.

```ts
export default defineNuxtConfig({
  hooks: {
    'sitemap:prerender': (ctx) => {
      // single sitemap example - just add the url directly
      ctx.urls.push({
        loc: '/my-secret-url',
        changefreq: 'daily',
        priority: 0.8,
      })
      // multi sitemap example - filter for a sitemap name
      if (ctx.sitemapName === 'posts') {
        ctx.urls.push({
          loc: '/posts/my-post',
          changefreq: 'daily',
          priority: 0.8,
        })
      }
    },
  },
})
```

## Nitro Hooks

### `sitemap:sitemap-xml`

**Type:** `async (ctx: { urls: SitemapConfig; sitemapName: string }) => void | Promise<void>`

This hook allows you to modify the sitemap.xml as runtime before it is sent to the client.

Note: For prerendered sitemaps this hook won't do anything.

```ts
import { defineNitroPlugin } from 'nitropack/runtime/plugin'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:sitemap-xml', async (ctx) => {
    // single sitemap example - just add the url directly
    ctx.urls.push({
      loc: '/my-secret-url',
      changefreq: 'daily',
      priority: 0.8,
    })
    // multi sitemap example - filter for a sitemap name
    if (ctx.sitemapName === 'posts') {
      ctx.urls.push({
        loc: '/posts/my-post',
        changefreq: 'daily',
        priority: 0.8,
      })
    }
  })
})
```

## Module Config

If you need further control over the sitemap.xml URLs, you can provide config on the `sitemap` key.

### `siteUrl`

- Type: `string`
- Default: `undefined`
- Required: `true`

The host of your site. This is required to generate the sitemap.xml. Example: https://example.com

### `trailingSlash`

- Type: `boolean`
- Default: `false`

Whether to add a trailing slash to the URLs in the sitemap.xml.

### `autoLastmod`

- Type: `boolean`
- Default: `true`

Whether to automatically detect the `lastmod` date for each URL.
If the `lastmod` date can't be inferred from a route page file it will use the current Date.

### `sitemaps`

- Type: `SitemapConfig[] | boolean`
- Default: `false`

Whether to generate multiple sitemaps. 

See [Multiple Sitemap Support](https://github.com/harlan-zw/nuxt-simple-sitemap#multiple-sitemap-support) for details.

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

### `inferStaticPagesAsRoutes`

- Type: `boolean`
- Default: `true`

Will generate routes from your static page files. Useful to disable if you're using the i18n module with custom routes. 

### `xsl`

- Type: `string | false
- Default: `/__sitemap__/style.xsl`

The path to the XSL stylesheet for the sitemap.xml. Set to `false` to disable.

### `discoverImages`

- Type: `boolean`
- Default: `true`

Whether to discover images from routes when prerendering.

### `autoAlternativeLangPrefixes`

- Type: `undefined | false | string[]`
- Default: `undefined`

Automatically add alternative language prefixes for each entry with the given prefixes. Set to `false` to disable.

When using the @nuxtjs/i18n module, this will automatically be set to the configured `locales` when left `undefined`.

## Sponsors

<p align="center">
  <a href="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg">
    <img src='https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg'/>
  </a>
</p>


## License

MIT License © 2022-PRESENT [Harlan Wilton](https://github.com/harlan-zw)
