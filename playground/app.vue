<script setup lang="ts">
import { useI18n, useSiteConfig } from '#imports'

const i18n = useI18n()
const locale = i18n.locale

const languageItems = [
  [
    { label: 'English', click() { i18n.setLocale('en') } },
    { label: 'French', click() { i18n.setLocale('fr') } },
  ],
]

const siteConfig = useSiteConfig({
  name: 'Sitemap',
})
</script>

<template>
  <UApp>
    <div class="flex flex-col min-h-screen">
      <header class="sticky top-0 z-50 w-full backdrop-blur border-b border-(--ui-border) bg-(--ui-bg)/75">
        <UContainer class="py-3">
          <div class="flex items-center justify-between">
            <NuxtLink
              to="/"
              class="flex items-end gap-1.5 font-bold text-xl text-(--ui-text-highlighted)"
            >
              <UIcon
                name="i-logos-nuxt-icon"
                class="size-8"
              />
              Nuxt
              <span class="text-(--ui-primary)">
                {{ siteConfig.name }}
              </span>
            </NuxtLink>
            <UDropdownMenu :items="languageItems">
              <UButton
                color="neutral"
                variant="outline"
                :label="locale"
                trailing-icon="i-lucide-chevron-down"
              />
            </UDropdownMenu>
          </div>
        </UContainer>
      </header>
      <main class="flex-grow">
        <UContainer class="py-6">
          <NuxtPage />
        </UContainer>
      </main>
    </div>
  </UApp>
</template>
