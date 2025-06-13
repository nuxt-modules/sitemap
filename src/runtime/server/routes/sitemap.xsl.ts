import { defineEventHandler, getHeader, setHeader, getQuery as h3GetQuery } from 'h3'
import { getQuery, parseURL, withQuery } from 'ufo'
import { useSitemapRuntimeConfig, xmlEscape } from '../utils'
import { useSiteConfig } from '#site-config/server/composables/useSiteConfig'
import { createSitePathResolver } from '#site-config/server/composables/utils'

export default defineEventHandler(async (e) => {
  const fixPath = createSitePathResolver(e, { absolute: false, withBase: true })

  const { sitemapName: fallbackSitemapName, cacheMaxAgeSeconds, version, xslColumns, xslTips } = useSitemapRuntimeConfig()
  setHeader(e, 'Content-Type', 'application/xslt+xml')
  if (cacheMaxAgeSeconds)
    setHeader(e, 'Cache-Control', `public, max-age=${cacheMaxAgeSeconds}, must-revalidate`)
  else
    setHeader(e, 'Cache-Control', `no-cache, no-store`)

  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="icon" style="margin-right: 4px; font-size: 25px;" width="1em" height="1em" viewBox="0 0 32 32"><path fill="#93c5fd" d="M4 26h4v4H4zm10 0h4v4h-4zm10 0h4v4h-4zm1-10h-8v-2h-2v2H7a2.002 2.002 0 0 0-2 2v6h2v-6h8v6h2v-6h8v6h2v-6a2.002 2.002 0 0 0-2-2zM9 2v10h14V2zm2 2h2v6h-2zm10 6h-6V4h6z"></path></svg>`
  const creditName = `<a href="https://github.com/nuxt-modules/sitemap" style="color: black; display: flex; align-items: center; font-weight: 500;" target="_blank" rel="noopener">${svgIcon} Nuxt Sitemap v${version}</a>`

  const { name: siteName, url: siteUrl } = useSiteConfig(e)

  const referrer = getHeader(e, 'Referer')! || '/'
  const referrerPath = parseURL(referrer).pathname
  const isNotIndexButHasIndex = referrerPath !== '/sitemap.xml' && referrerPath !== '/sitemap_index.xml' && referrerPath.endsWith('.xml')
  const sitemapName = parseURL(referrer).pathname.split('/').pop()?.split('-sitemap')[0] || fallbackSitemapName
  const title = `${siteName}${sitemapName !== 'sitemap.xml' ? ` - ${sitemapName === 'sitemap_index.xml' ? 'index' : sitemapName}` : ''}`.replace(/&/g, '&amp;')

  // we need to tell the user their site url and allow them to render the sitemap with the canonical url
  // check if referrer has the query
  const canonicalQuery = getQuery(referrer).canonical
  const isShowingCanonical = typeof canonicalQuery !== 'undefined' && canonicalQuery !== 'false'

  const conditionalTips = [
    'You are looking at a <a href="https://developer.mozilla.org/en-US/docs/Web/XSLT/Transforming_XML_with_XSLT/An_Overview" style="color: #398465" target="_blank">XML stylesheet</a>. Read the <a href="https://nuxtseo.com/sitemap/guides/customising-ui" style="color: #398465" target="_blank">docs</a> to learn how to customize it. View the page source to see the raw XML.',
    `URLs missing? Check Nuxt Devtools Sitemap tab (or the <a href="${xmlEscape(withQuery('/__sitemap__/debug.json', { sitemap: sitemapName }))}" style="color: #398465" target="_blank">debug endpoint</a>).`,
  ]

  // Add fetch error information if available via query params
  const fetchErrors: string[] = []
  const xslQuery = h3GetQuery(e)
  if (xslQuery.error_messages) {
    const errorMessages = xslQuery.error_messages
    const errorUrls = xslQuery.error_urls

    if (errorMessages) {
      const messages = Array.isArray(errorMessages) ? errorMessages : [errorMessages]
      const urls = Array.isArray(errorUrls) ? errorUrls : (errorUrls ? [errorUrls] : [])

      messages.forEach((msg, i) => {
        const errorParts = [xmlEscape(msg)]
        if (urls[i]) {
          errorParts.push(xmlEscape(urls[i]))
        }
        fetchErrors.push(`<strong style="color: #dc2626;">Error ${i + 1}:</strong> ${errorParts.join(' - ')}`)
      })
    }

    if (fetchErrors.length === 0) {
      conditionalTips.push('Add <code>?debug</code> or <code>?errors</code> to the sitemap URL to see detailed error information when external sources fail.')
    }
  }
  if (!isShowingCanonical) {
    const canonicalPreviewUrl = withQuery(referrer, { canonical: '' })
    conditionalTips.push(`Your canonical site URL is <strong>${xmlEscape(siteUrl)}</strong>.`)
    conditionalTips.push(`You can preview your canonical sitemap by visiting <a href="${xmlEscape(canonicalPreviewUrl)}" style="color: #398465; white-space: nowrap;">${xmlEscape(fixPath(canonicalPreviewUrl))}?canonical</a>`)
  }
  else {
    // avoid text wrap
    conditionalTips.push(`You are viewing the canonical sitemap. You can switch to using the request origin: <a href="${xmlEscape(fixPath(referrer))}" style="color: #398465; white-space: nowrap ">${xmlEscape(fixPath(referrer))}</a>`)
  }

  // Separate development tips from production runtime errors
  const hasRuntimeErrors = fetchErrors.length > 0
  const showDevTips = import.meta.dev && xslTips !== false
  const showSidebar = showDevTips || hasRuntimeErrors

  // Build development tips section
  const devTips = showDevTips ? conditionalTips.map(t => `<li><p>${t}</p></li>`).join('\n') : ''

  // Build runtime errors section
  const runtimeErrors = hasRuntimeErrors
    ? fetchErrors.map(t => `<li><p>${t}</p></li>`).join('\n')
    : ''
  let columns = [...xslColumns!]
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
                xmlns:xhtml="http://www.w3.org/1999/xhtml"
                xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
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
            color: #398465;
            font-weight: 600;
          }

          .expl a:visited {
            color: #398465;
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
          .mb-3 { margin-bottom: 0.75rem; }
        </style>
      </head>
      <body>
        <div style="grid-template-columns: 1fr 1fr; display: grid; margin: 3rem;">
            <div>
             <div id="content">
          <h1 class="text-2xl mb-3">XML Sitemap</h1>
          <h2>${xmlEscape(title)}</h2>
          ${isNotIndexButHasIndex ? `<p style="font-size: 12px; margin-bottom: 1rem;"><a href="${xmlEscape(fixPath('/sitemap_index.xml'))}">${xmlEscape(fixPath('/sitemap_index.xml'))}</a></p>` : ''}
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
                    ${showSidebar
                      ? `<div class="w-30 top-2 shadow rounded p-5 right-2" style="margin: 0 auto;">
                      ${showDevTips ? `<div><p><strong>Development Tips</strong></p><ul style="margin: 1rem 0; padding: 0;">${devTips}</ul></div>` : ''}
                      ${hasRuntimeErrors ? `<div${showDevTips ? ' style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;"' : ''}><p><strong style="color: #dc2626;">Runtime Errors</strong></p><ul style="margin: 1rem 0; padding: 0;">${runtimeErrors}</ul></div>` : ''}
                      ${showDevTips ? `<p style="margin-top: 1rem;">${creditName}</p>` : ''}
                    </div>`
                      : ''}
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
`
})
