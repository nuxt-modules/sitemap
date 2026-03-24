<script setup lang="ts">
import type { SitemapDefinition } from '../../src/runtime/types'
import { joinURL } from 'ufo'
import { computed } from 'vue'
import Source from '../components/Source.vue'
import { data, productionData, productionLoading, productionRemoteDebugData, refreshProductionData } from '../composables/state'

const appSourcesExcluded = computed(() => data.value?.runtimeConfig?.excludeAppSources || [])

function resolveSitemapOrigin() {
  if (isProductionMode.value && productionUrl.value)
    return `${productionUrl.value.replace(/\/$/, '')}/`
  return data.value?.nitroOrigin || ''
}

function resolveSitemapPath(sitemapName: string) {
  const source = productionRemoteDebugData.value || data.value
  if (!source)
    return ''
  const prefix = source.runtimeConfig?.sitemapsPathPrefix || ''
  if (sitemapName === 'sitemap' || sitemapName === 'sitemap.xml')
    return '/sitemap.xml'
  if (sitemapName === 'index')
    return '/sitemap_index.xml'
  return joinURL('/', prefix, `${sitemapName}-sitemap.xml`)
}

function resolveSitemapUrl(sitemapName: string) {
  return `${resolveSitemapOrigin()}${resolveSitemapPath(sitemapName).replace(/^\//, '')}`
}

function resolveSitemapOptions(definition: SitemapDefinition) {
  const options: Record<string, any> = {}
  Object.entries(definition).forEach(([key, value]) => {
    if (value !== undefined && (!Array.isArray(value) || value.length > 0) && key !== 'includeAppSources')
      options[key] = value
  })
  return options
}

function sitemapOptionsAsKeyValues(definition: SitemapDefinition) {
  const options = resolveSitemapOptions(definition)
  return Object.entries(options).map(([key, value]) => {
    const isObject = typeof value === 'object'
    return {
      key,
      value: isObject ? JSON.stringify(value, null, 2) : value,
      mono: true,
      code: isObject ? 'json' as const : undefined,
    }
  })
}

function sitemapPathFromUrl(url: string) {
  try {
    return new URL(url).pathname
  }
  catch {
    return url
  }
}

const hasRemoteDebug = computed(() => !!productionRemoteDebugData.value)

const totalProductionUrls = computed(() =>
  productionData.value?.sitemaps.reduce((sum, s) => sum + s.urlCount, 0) ?? 0,
)

const totalProductionWarnings = computed(() =>
  productionData.value?.sitemaps.reduce((sum, s) => sum + s.warnings.length, 0) ?? 0,
)
</script>

<template>
  <div class="space-y-5 animate-fade-up">
    <!-- Production mode -->
    <template v-if="isProductionMode">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold mb-1">
            Production Sitemaps
          </h2>
          <p class="text-xs text-[var(--color-text-muted)]">
            Fetched from {{ productionUrl }}<template v-if="hasRemoteDebug">
              with debug mode enabled
            </template>.
          </p>
        </div>
        <UButton
          icon="carbon:reset"
          size="xs"
          variant="ghost"
          :loading="productionLoading"
          @click="refreshProductionData()"
        >
          Re-validate
        </UButton>
      </div>

      <DevtoolsLoading v-if="productionLoading && !productionData && !productionRemoteDebugData" />

      <!-- Full debug view (production has debug: true) -->
      <template v-if="hasRemoteDebug">
        <DevtoolsSection
          v-for="(sitemap, key) in productionRemoteDebugData!.sitemaps"
          :key="key"
        >
          <template #text>
            <div class="flex items-center gap-2">
              <span class="font-semibold">{{ sitemap.sitemapName }}</span>
              <a
                target="_blank"
                :href="resolveSitemapUrl(sitemap.sitemapName)"
                class="link-external text-xs font-mono text-[var(--color-text-muted)]"
              >
                {{ resolveSitemapPath(sitemap.sitemapName) }}
              </a>
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
          <div class="space-y-5">
            <template v-if="sitemap.sitemapName === 'index'">
              <DevtoolsAlert variant="info">
                Links to your other sitemaps.
                <a
                  href="https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps"
                  target="_blank"
                  class="link-external"
                >
                  Learn more
                </a>
              </DevtoolsAlert>
            </template>
            <template v-else>
              <div
                v-if="sitemap.sources && sitemap.sources.length"
                class="flex gap-4"
              >
                <div class="w-32 flex-shrink-0">
                  <div class="font-semibold text-sm">
                    Sources
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
              <div class="flex gap-4">
                <div class="w-32 flex-shrink-0">
                  <div class="font-semibold text-sm">
                    Options
                  </div>
                </div>
                <div class="flex-grow">
                  <DevtoolsKeyValue
                    :items="sitemapOptionsAsKeyValues(sitemap)"
                    striped
                  />
                </div>
              </div>
            </template>
          </div>
        </DevtoolsSection>
      </template>

      <!-- XML-based fallback view -->
      <template v-else-if="productionData?.error">
        <DevtoolsProductionError :error="productionData.error" />
      </template>

      <template v-else-if="productionData">
        <!-- Summary -->
        <div class="flex items-center gap-4">
          <DevtoolsMetric
            :value="productionData.sitemaps.length"
            :label="productionData.isIndex ? 'child sitemaps' : 'sitemap'"
            variant="info"
          />
          <DevtoolsMetric
            :value="totalProductionUrls"
            label="total URLs"
            variant="success"
          />
          <DevtoolsMetric
            v-if="totalProductionWarnings > 0"
            :value="totalProductionWarnings"
            label="warnings"
            variant="warning"
          />
        </div>

        <!-- Each production sitemap -->
        <DevtoolsSection
          v-for="(sitemap, i) in productionData.sitemaps"
          :key="i"
        >
          <template #text>
            <div class="flex items-center gap-2">
              <span class="font-semibold">{{ sitemapPathFromUrl(sitemap.loc) }}</span>
              <DevtoolsMetric
                :value="sitemap.urlCount"
                label="URLs"
                variant="success"
              />
              <UIcon
                v-if="sitemap.error"
                name="carbon:warning"
                class="text-red-500"
              />
              <UIcon
                v-else-if="sitemap.warnings.length"
                name="carbon:warning-alt"
                class="text-amber-500"
              />
            </div>
          </template>
          <template #description>
            <a
              :href="sitemap.loc"
              target="_blank"
              class="link-external text-xs font-mono text-[var(--color-text-muted)]"
            >
              {{ sitemap.loc }}
            </a>
          </template>
          <div v-if="sitemap.error || sitemap.warnings.length" class="space-y-3">
            <DevtoolsAlert
              v-if="sitemap.error"
              variant="warning"
            >
              {{ sitemap.error }}
            </DevtoolsAlert>
            <DevtoolsAlert
              v-if="sitemap.warnings.length"
              variant="warning"
            >
              <div>
                <div class="text-xs font-semibold mb-1">
                  {{ sitemap.warnings.length }} validation warning{{ sitemap.warnings.length > 1 ? 's' : '' }}
                </div>
                <ul class="prod-warnings-list">
                  <li
                    v-for="(w, wi) in sitemap.warnings"
                    :key="wi"
                  >
                    <template v-if="w.context?.url">
                      <code>{{ w.context.url }}</code>:
                    </template>
                    {{ w.message }}
                  </li>
                </ul>
              </div>
            </DevtoolsAlert>
          </div>
        </DevtoolsSection>

        <!-- Hint about debug mode -->
        <DevtoolsAlert variant="info">
          Want to see full source details and URL validation? Deploy with <code>sitemap: { debug: true }</code> to get the same detailed view as development mode.
        </DevtoolsAlert>
      </template>
    </template>

    <!-- Local mode -->
    <template v-else>
      <div>
        <h2 class="text-lg font-semibold mb-1">
          Sitemaps
        </h2>
        <p class="text-xs text-[var(--color-text-muted)]">
          The sitemaps generated from your site.
        </p>
      </div>
      <DevtoolsSection
        v-for="(sitemap, key) in data?.sitemaps"
        :key="key"
      >
        <template #text>
          <div class="flex items-center gap-2">
            <span class="font-semibold">{{ sitemap.sitemapName }}</span>
            <a
              target="_blank"
              :href="resolveSitemapUrl(sitemap.sitemapName)"
              class="link-external text-xs font-mono text-[var(--color-text-muted)]"
            >
              {{ resolveSitemapPath(sitemap.sitemapName) }}
            </a>
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
        <div class="space-y-5">
          <template v-if="sitemap.sitemapName === 'index'">
            <DevtoolsAlert variant="info">
              Links to your other sitemaps.
              <a
                href="https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps"
                target="_blank"
                class="link-external"
              >
                Learn more
              </a>
            </DevtoolsAlert>
          </template>
          <template v-else>
            <div
              v-if="sitemap.sources && sitemap.sources.length"
              class="flex gap-4"
            >
              <div class="w-32 flex-shrink-0">
                <div class="font-semibold text-sm">
                  Sources
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
            <div class="flex gap-4">
              <div class="w-32 flex-shrink-0">
                <div class="font-semibold text-sm">
                  App Sources
                </div>
              </div>
              <div class="flex-grow flex items-center gap-3">
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
                <NuxtLink
                  to="/app-sources"
                  class="text-xs text-[var(--seo-green)] hover:underline"
                >
                  View details
                </NuxtLink>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="w-32 flex-shrink-0">
                <div class="font-semibold text-sm">
                  Options
                </div>
              </div>
              <div class="flex-grow">
                <DevtoolsKeyValue
                  :items="sitemapOptionsAsKeyValues(sitemap)"
                  striped
                />
              </div>
            </div>
          </template>
        </div>
      </DevtoolsSection>
    </template>
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

.prod-warnings-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.prod-warnings-list li {
  padding: 0.125rem 0;
}

.prod-warnings-list code {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  padding: 0.0625rem 0.3125rem;
  border-radius: 3px;
  background: var(--color-surface-sunken);
  color: var(--color-text);
}
</style>
