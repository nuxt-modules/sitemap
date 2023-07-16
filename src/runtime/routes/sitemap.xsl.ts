import { defineEventHandler, getHeader, setHeader } from 'h3'
import { getQuery, parseURL, withQuery } from 'ufo'
import type { ModuleRuntimeConfig } from '../types'
import { createSitePathResolver, useRuntimeConfig, useSiteConfig } from '#imports'

export default defineEventHandler(async (e) => {
  setHeader(e, 'Content-Type', 'application/xslt+xml')
  if (!process.dev)
    setHeader(e, 'Cache-Control', 'max-age=600, must-revalidate')

  const fixPath = createSitePathResolver(e, { absolute: false, withBase: true })

  const { version, moduleConfig } = useRuntimeConfig()['nuxt-simple-sitemap'] as any as ModuleRuntimeConfig

  const creditName = `<a href="https://github.com/harlan-zw/nuxt-simple-sitemap" style="color: black; font-weight: 500;" target="_blank" rel="noopener">Nuxt
            Simple Sitemap</a> v${version}`

  const { name: siteName, url: siteUrl } = useSiteConfig(e)

  const referrer = getHeader(e, 'Referer')! || '/'
  const isNotIndexButHasIndex = referrer !== fixPath('/sitemap.xml') && parseURL(referrer).pathname.endsWith('-sitemap.xml')
  const sitemapName = parseURL(referrer).pathname.split('/').pop()?.split('-sitemap')[0] || undefined
  // we need to tell the user their site url and allow them to render the sitemap with the canonical url
  // check if referrer has the query
  const canonicalQuery = getQuery(referrer).canonical
  const isShowingCanonical = typeof canonicalQuery !== 'undefined' && canonicalQuery !== 'false'

  const conditionalTips = [
    'You are looking at a <a href="https://developer.mozilla.org/en-US/docs/Web/XSLT/Transforming_XML_with_XSLT/An_Overview" style="color: #398465" target="_blank">XML stylesheet</a>. Read the  <a href="nuxtseo.com/sitemap/guides/customising-ui" style="color: #398465" target="_blank">docs</a> to learn how to customize it.',
    `URLs missing? Check the <a href="${withQuery('/api/__sitemap__/debug', { sitemap: sitemapName })}" style="color: #398465" target="_blank">debug endpoint</a>`,
  ]
  if (!isShowingCanonical) {
    const canonicalPreviewUrl = withQuery(referrer, { canonical: '' })
    conditionalTips.push(`Your canonical site URL is <strong>${siteUrl}</strong>.`)
    conditionalTips.push(`You can preview your canonical sitemap by visiting <a href="${canonicalPreviewUrl}" style="color: #398465; white-space: nowrap;">${fixPath(canonicalPreviewUrl)}?canonical</a>`)
  }
  else {
    // avoid text wrap
    conditionalTips.push(`You are viewing the canonical sitemap. You can switch to using the request origin: <a href="${fixPath(referrer)}" style="color: #398465; white-space: nowrap ">${fixPath(referrer)}</a>`)
  }

  const tips = conditionalTips.map(t => `<li><p>${t}</p></li>`).join('\n')

  const showTips = process.dev && moduleConfig.xslTips !== false
  let columns = [...moduleConfig.xslColumns!]
  if (!columns.length) {
    columns = [
      { label: 'URL', width: '50%' },
      { label: 'Images', width: '25%', select: 'count(image:image)' },
      { label: 'Last Updated', width: '25%', select: 'concat(substring(sitemap:lastmod,0,11),concat(\' \', substring(sitemap:lastmod,12,5)),concat(\' \', substring(sitemap:lastmod,20,6)))' },
    ]
  }

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

          .bg-yellow-200 {
            background-color: #fef9c3;
          }

          .p-5 {
            padding: 1.25rem;
          }

          .rounded {
            border-radius: 4px;
            }

          .shadow {
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
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

          .expl a {
            color: #398465
            font-weight: 600;
          }

          .expl a:visited {
            color: #398465
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

          .text-2xl {
            font-size: 2rem;
            font-weight: 600;
            line-height: 1.25;
          }

          th {
            text-align: left;
            padding-right: 30px;
            font-size: 12px;
          }

          thead th {
            border-bottom: 1px solid #000;
          }
          .fixed { position: fixed; }
          .right-2 { right: 2rem; }
          .top-2 { top: 2rem; }
          .w-30 { width: 30rem; }
          p { margin: 0; }
          li { padding-bottom: 0.5rem; line-height: 1.5; }
          h1 { margin: 0; }
          .mb-5 { margin-bottom: 1.25rem; }
        </style>
      </head>
      <body>
        <div style="grid-template-columns: 1fr 1fr; display: grid; margin: 3rem;">
            <div>
             <div id="content">
          <h1 class="text-2xl mb-5">${siteName} XML Sitemap</h1>
          ${isNotIndexButHasIndex ? `<p style="font-size: 12px; margin-bottom: 1rem;"><a href="${fixPath('/sitemap_index.xml')}">${fixPath('/sitemap_index.xml')}</a></p>` : ''}
          <xsl:if test="count(sitemap:sitemapindex/sitemap:sitemap) &gt; 0">
            <p class="expl" style="margin-bottom: 1rem;">
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
            <p class="expl" style="margin-bottom: 1rem;">
              This XML Sitemap contains
              <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs.
            </p>
            <table id="sitemap" cellpadding="3">
              <thead>
                <tr>
                  ${columns!.map(c => `<th width="${c.width}">${c.label}</th>`).join('\n')}
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
                    ${columns.filter(c => c.label !== 'URL').map(c => `<td>\n<xsl:value-of select="${c.select}"/>\n</td>`).join('\n')}
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </xsl:if>
        </div>
        </div>
                    ${showTips ? `<div class="w-30 top-2 shadow rounded p-5 right-2" style="margin: 0 auto;"><p><strong>Sitemap Tips</strong></p><ul style="margin: 1rem; padding: 0;">${tips}</ul><p style="margin-top: 1rem;">${creditName}</p></div>` : ''}
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
`
})
