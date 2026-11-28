# Security Policy

## Reporting a Vulnerability

I take the security of my Nuxt modules seriously. If you believe you've found a security vulnerability, please follow these steps:

### Option 1: GitHub Security Advisory

1. Go to the GitHub repository of the affected module
2. Navigate to "Security" tab
3. Select "Report a vulnerability"
4. Provide a detailed description of the vulnerability

### Option 2: Email

Alternatively, you can email security concerns directly to:
- harlan@harlanzw.com

## What to Include in Your Report

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any possible mitigations you've identified

## Response Process

When a vulnerability is reported:

1. I will acknowledge receipt within 48 hours
2. I will validate and investigate the report
3. I will work on a fix and coordinate the release process
4. After the fix is released, I will acknowledge your contribution (if desired)

## Scope

This repository publishes two npm packages with different threat models. Target each advisory to the exact affected package so downstream users get accurate alerts.

- **`@nuxtjs/sitemap`**: Generates sitemaps for Nuxt applications. Configured `sources` are treated as developer-controlled inputs, and `/__sitemap__/debug-production.json` runs only in development.
- **`sitemapd`** (`packages/sitemapd`): Parses sitemaps and traverses sitemap indexes within configured byte and entry limits, including third-party documents. Network access, SSRF/DNS policy, body size limits on caller-supplied strings, and worker isolation remain the host application's responsibility.

When reporting an issue in `sitemapd`, note whether `@nuxtjs/sitemap` reaches that code path in production.

Thank you for helping keep the Nuxt ecosystem secure!
