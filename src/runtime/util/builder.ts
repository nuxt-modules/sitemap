import { withBase } from 'ufo'
import type { NuxtSimpleSitemapRuntime, SitemapRenderCtx } from '../../module'
import { generateSitemapEntries } from './entries'
import { normaliseDate } from './normalise'

/**
 * How many sitemap entries we can have in a single sitemap.
 */
const MaxSitemapSize = 1000

export interface BuildSitemapOptions {
  sitemapConfig: NuxtSimpleSitemapRuntime
  baseURL: string
  getRouteRulesForPath: (path: string) => Record<string, any>
  callHook?: (ctx: SitemapRenderCtx) => Promise<void>
}

export async function buildSitemapIndex(options: BuildSitemapOptions) {
  const entries = []
  let sitemapsConfig = options.sitemapConfig.sitemaps
  if (sitemapsConfig === true) {
    // we need to generate multiple sitemaps with dynamically generated names
    const urls = await generateSitemapEntries({
      ...options,
      sitemapConfig: { ...options.sitemapConfig },
    })
    sitemapsConfig = {}
    // split into the max size which should be 1000
    urls.forEach((url, i) => {
      const chunkIndex = Math.floor(i / MaxSitemapSize)
      sitemapsConfig[chunkIndex] = sitemapsConfig[chunkIndex] || []
      sitemapsConfig[chunkIndex].push(url)
    })
  }
  for (const sitemap in sitemapsConfig) {
    // user provided sitemap config
    if (!sitemapsConfig[sitemap].urls) {
      sitemapsConfig[sitemap].urls = await generateSitemapEntries({
        ...options,
        sitemapConfig: { ...options.sitemapConfig, ...sitemapsConfig[sitemap] },
      })
    }
    entries.push({
      lastmod: normaliseDate(sitemapsConfig[sitemap].urls
        .filter(a => !!a?.lastmod)
        .map(a => typeof a.lastmod === 'string' ? new Date(a.lastmod) : a.lastmod)
        .sort((a: Date, b: Date) => b.getTime() - a.getTime())?.[0] || new Date(),
      ),
      sitemap: withBase(`${sitemap}-sitemap.xml`, withBase(options.baseURL, options.sitemapConfig.siteUrl)),
    })
  }
  return {
    sitemaps: entries,
    xml: wrapSitemapXml([
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...(entries?.map(e => `    <sitemap>
        <loc>${escapeValue(e.sitemap)}</loc>
        <lastmod>${escapeValue(e.lastmod)}</lastmod>
    </sitemap>`) ?? []),
      '</sitemapindex>',
    ]),
  }
}
export async function buildSitemap(options: BuildSitemapOptions & { sitemapName: string }) {
  const sitemapsConfig = options.sitemapConfig.sitemaps
  let urls = await generateSitemapEntries(options)
  if (sitemapsConfig === true)
    urls = urls.slice(Number(options.sitemapName) * MaxSitemapSize, (Number(options.sitemapName) + 1) * MaxSitemapSize)
  const ctx: SitemapRenderCtx = { urls, sitemapName: options.sitemapName }
  await options.callHook?.(ctx)
  const resolveKey = (k: string) => {
    switch (k) {
      case 'images':
        return 'image'
      case 'videos':
        return 'video'
      // news & others?
      default:
        return k
    }
  }
  const handleArray = (key: string, arr: Record<string, any>[]) => {
    key = resolveKey(key)
    return `<${key}:${key}>
${arr.map(obj => Object.entries(obj).map(([sk, sv]) => `            <${key}:${sk}>${escapeValue(sv)}</${key}:${sk}>`)).join('\n')}
        </${key}:${key}>`
  }
  return wrapSitemapXml([
    '<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd http://www.google.com/schemas/sitemap-image/1.1 http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...(ctx.urls?.map(e => `    <url>
${Object.keys(e).map(k => `        ${Array.isArray(e[k]) ? handleArray(k, e[k]) : `<${k}>${escapeValue(e[k])}</${k}>`}`).join('\n')}
    </url>`) ?? []),
    '</urlset>',
  ])
}

function escapeValue(value: string) {
  return String(value).replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function generateXslStylesheet() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <style type="text/css">
          body {
            font-family: Inter, Helvetica, Arial, sans-serif;
            font-size: 14px;
            color: #333;
          }

          table {
            border: none;
            border-collapse: collapse;
          }

          #sitemap tr:nth-child(odd) td {
            background-color: #f8f8f8 !important;
          }

          #sitemap tbody tr:hover td {
            background-color: #fff;
          }

          #sitemap tbody tr:hover td, #sitemap tbody tr:hover td a {
            color: #000;
          }

          #content {
            margin: 0 auto;
            width: 1000px;
          }

          .warn {
            padding: 10px;
            background-color: #fef9c3;
            color: #ca8a04;
            border-radius: 4px;
            margin: 10px 0 !important;
            display: inline-block;
          }

          .expl {
            margin: 18px 3px;
            line-height: 1.2em;
          }

          .expl a {
            color: #00DC82;
            font-weight: 600;
          }

          .expl a:visited {
            color: #00DC82;
          }

          a {
            color: #000;
            text-decoration: none;
          }

          a:visited {
            color: #777;
          }

          a:hover {
            text-decoration: underline;
          }

          td {
            font-size: 12px;
          }

          th {
            text-align: left;
            padding-right: 30px;
            font-size: 12px;
          }

          thead th {
            border-bottom: 1px solid #000;
          }
        </style>
      </head>
      <body>
        <div id="content">
          <h1>XML Sitemap</h1>
          <p class="expl">
            Generated by <a href="https://github.com/harlan-zw/nuxt-simple-sitemap" target="_blank" rel="noopener">Nuxt
            Simple Sitemap</a>.
          </p>
          ${process.dev ? '<p class="expl warn"><strong>Development preview</strong><br/>Your data may be different if you prerender your app. Consider testing with `nuxi generate`.</p>' : ''}
          <xsl:if test="count(sitemap:sitemapindex/sitemap:sitemap) &gt; 0">
            <p class="expl">
              This XML Sitemap Index file contains
              <xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/> sitemaps.
            </p>
            <table id="sitemap" cellpadding="3">
              <thead>
                <tr>
                  <th width="75%">Sitemap</th>
                  <th width="25%">Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                  <xsl:variable name="sitemapURL">
                    <xsl:value-of select="sitemap:loc"/>
                  </xsl:variable>
                  <tr>
                    <td>
                      <a href="{$sitemapURL}">
                        <xsl:value-of select="sitemap:loc"/>
                      </a>
                    </td>
                    <td>
                      <xsl:value-of
                        select="concat(substring(sitemap:lastmod,0,11),concat(' ', substring(sitemap:lastmod,12,5)),concat(' ', substring(sitemap:lastmod,20,6)))"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </xsl:if>
          <xsl:if test="count(sitemap:sitemapindex/sitemap:sitemap) &lt; 1">
            <p class="expl">
              This XML Sitemap contains
              <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs.
            </p>
            <table id="sitemap" cellpadding="3">
              <thead>
                <tr>
                  <th width="75%">URL</th>
                  <th width="5%">Images</th>
                  <th title="Last Modification Time" width="20%">Last Mod.</th>
                </tr>
              </thead>
              <tbody>
                <xsl:variable name="lower" select="'abcdefghijklmnopqrstuvwxyz'"/>
                <xsl:variable name="upper" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"/>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <tr>
                    <td>
                      <xsl:variable name="itemURL">
                        <xsl:value-of select="sitemap:loc"/>
                      </xsl:variable>
                      <a href="{$itemURL}">
                        <xsl:value-of select="sitemap:loc"/>
                      </a>
                    </td>
                    <td>
                      <xsl:value-of select="count(image:image)"/>
                    </td>
                    <td>
                      <xsl:value-of
                        select="concat(substring(sitemap:lastmod,0,11),concat(' ', substring(sitemap:lastmod,12,5)),concat(' ', substring(sitemap:lastmod,20,6)))"/>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </xsl:if>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
`
}

function wrapSitemapXml(input: string[]) {
  input.unshift('<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="/__sitemap__/style.xsl"?>')
  input.push('<!-- XML Sitemap generated by Nuxt Simple Sitemap -->')
  return input.join('\n')
}
