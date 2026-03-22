<script setup lang="ts">
import type { SitemapDefinition } from '../../src/runtime/types'
import OCodeBlock from 'nuxtseo-shared/client/components/OCodeBlock'
import OSectionBlock from 'nuxtseo-shared/client/components/OSectionBlock'
import { joinURL } from 'ufo'
import { computed } from 'vue'
import Source from '../components/Source.vue'
import { data } from '../composables/state'

const appSourcesExcluded = computed(() => data.value?.runtimeConfig?.excludeAppSources || [])

function resolveSitemapUrl(sitemapName: string) {
  if (!data.value)
    return ''
  if (sitemapName === 'sitemap' || sitemapName === 'sitemap.xml')
    return `${data.value.nitroOrigin}sitemap.xml`
  if (sitemapName === 'index')
    return `${data.value.nitroOrigin}sitemap_index.xml`
  return joinURL(data.value.nitroOrigin, data.value.runtimeConfig?.sitemapsPathPrefix || '', `${sitemapName}-sitemap.xml`)
}

function resolveSitemapOptions(definition: SitemapDefinition) {
  const options: Record<string, any> = {}
  Object.entries(definition).forEach(([key, value]) => {
    if (value !== undefined && (!Array.isArray(value) || value.length > 0) && key !== 'includeAppSources')
      options[key] = value
  })
  return options
}
</script>

<template>
  <div class="space-y-5 animate-fade-up">
    <div>
      <h2 class="text-lg font-semibold mb-1">
        Sitemaps
      </h2>
      <p class="text-xs text-[var(--color-text-muted)]">
        The sitemaps generated from your site.
      </p>
    </div>
    <OSectionBlock
      v-for="(sitemap, key) in data?.sitemaps"
      :key="key"
    >
      <template #text>
        <div class="flex items-center gap-2">
          <span class="font-semibold">{{ sitemap.sitemapName }}</span>
          <UIcon
            v-if="(sitemap.sources || []).some(s => typeof s !== 'string' && 'error' in s && !!s.error)"
            name="carbon:warning"
            class="text-red-500"
          />
          <UIcon
            v-else-if="(sitemap.sources || []).some(s => typeof s !== 'string' && '_urlWarnings' in s && s._urlWarnings?.length)"
            name="carbon:warning-alt"
            class="text-amber-500"
          />
        </div>
      </template>
      <template #description>
        <a
          target="_blank"
          :href="resolveSitemapUrl(sitemap.sitemapName)"
          class="link-external text-sm"
        >
          {{ resolveSitemapUrl(sitemap.sitemapName) }}
        </a>
      </template>
      <div class="space-y-5">
        <template v-if="sitemap.sitemapName === 'index'">
          <div class="hint-callout">
            <UIcon
              name="carbon:information"
              class="hint-callout-icon text-lg flex-shrink-0 mt-0.5"
            />
            <div class="text-sm text-[var(--color-text-muted)]">
              This is a special sitemap file that links to your other sitemaps.
              <a
                href="https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps"
                target="_blank"
                class="link-external"
              >
                Learn more about sitemap indexes
              </a>
            </div>
          </div>
        </template>
        <template v-else>
          <div
            v-if="sitemap.sources && sitemap.sources.length"
            class="flex gap-5"
          >
            <div class="w-40 flex-shrink-0">
              <div class="font-semibold text-sm mb-1">
                Sources
              </div>
              <div class="text-xs text-[var(--color-text-muted)]">
                Local sources associated with just this sitemap.
              </div>
            </div>
            <div class="flex-grow space-y-2">
              <Source
                v-for="(source, k) in sitemap.sources"
                :key="k"
                :source="source"
              />
            </div>
          </div>
          <div class="flex gap-5">
            <div class="w-40 flex-shrink-0">
              <div class="font-semibold text-sm mb-1">
                App Sources
              </div>
              <div class="text-xs text-[var(--color-text-muted)]">
                Configured with the <code class="px-1 py-0.5 rounded bg-[var(--color-surface-sunken)]">includeAppSources</code> option.
              </div>
            </div>
            <div class="flex-grow flex flex-col justify-center">
              <div
                v-if="sitemap.includeAppSources && appSourcesExcluded !== true"
                class="status-enabled"
              >
                <UIcon
                  name="carbon:checkmark"
                  class="text-sm"
                />
                <span>Enabled</span>
              </div>
              <div
                v-else
                class="status-disabled"
              >
                <UIcon
                  name="carbon:close"
                  class="text-sm"
                />
                <span>Disabled</span>
              </div>
              <div class="text-xs text-[var(--color-text-subtle)] mt-2">
                Switch to
                <NuxtLink
                  to="/app-sources"
                  class="text-[var(--seo-green)] hover:underline"
                >
                  App sources
                </NuxtLink>
                to learn more.
              </div>
            </div>
          </div>
          <div class="flex gap-5">
            <div class="w-40 flex-shrink-0">
              <div class="font-semibold text-sm mb-1">
                Sitemap Options
              </div>
              <div class="text-xs text-[var(--color-text-muted)]">
                Extra options used to filter the URLs on the final sitemap and set defaults.
              </div>
            </div>
            <div class="flex-grow">
              <OCodeBlock
                class="max-h-[350px] min-h-full overflow-y-auto"
                :code="JSON.stringify(resolveSitemapOptions(sitemap), null, 2)"
                lang="json"
              />
            </div>
          </div>
        </template>
      </div>
    </OSectionBlock>
  </div>
</template>

<style scoped>
.status-enabled {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  background: oklch(75% 0.15 145 / 0.12);
  color: oklch(50% 0.15 145);
}

.dark .status-enabled {
  background: oklch(50% 0.15 145 / 0.15);
  color: oklch(75% 0.18 145);
}

.status-disabled {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: var(--radius-sm);
  background: oklch(65% 0.12 25 / 0.1);
  color: oklch(55% 0.15 25);
}

.dark .status-disabled {
  background: oklch(45% 0.1 25 / 0.15);
  color: oklch(70% 0.12 25);
}
</style>
