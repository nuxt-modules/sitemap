<script setup lang="ts">
import { useI18n, useSiteConfig } from '#imports'

const i18n = useI18n()

function setLanguage(code: string) {
  i18n.setLocale(code)
}

const locale = i18n.locale

const languageOptions = [
  [
    { label: 'English', click() { setLanguage('en') } },
    { label: 'French', click() { setLanguage('fr') } },
  ],
]

const siteConfig = useSiteConfig({
  name: 'Sitemap',
})
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <header class="sticky top-0 z-50 w-full backdrop-blur flex-none border-b border-gray-900/10 dark:border-gray-50/[0.06] bg-white/75 dark:bg-gray-900/75">
      <UContainer class="py-3">
        <div class="flex items-center justify-between">
          <NuxtLink
            to="/"
            class="flex items-end gap-1.5 font-bold text-xl text-gray-900 dark:text-white"
          >
            <UIcon
              name="i-logos-nuxt-icon"
              class="w-8 h-8"
            />
            Nuxt
            <div class="text-primary-500 dark:text-primary-400">
              {{ siteConfig.name }}
            </div>
          </NuxtLink>
          <UDropdown
            :items="languageOptions"
            :popper="{ placement: 'bottom-start' }"
          >
            <UButton
              color="white"
              :label="locale"
              trailing-icon="i-heroicons-chevron-down-20-solid"
            />
          </UDropdown>
        </div>
      </UContainer>
    </header>
    <main class="min-h-full h-full flex-grow">
      <UContainer class="mt-4">
        <NuxtPage />
      </UContainer>
    </main>
    <footer class="text-sm text-gray-700 flex justify-center items-center py-5">
      Made by <UAvatar
        src="https://avatars.githubusercontent.com/u/5326365?v=4"
        size="xs"
        class="w-5 h-5 mx-1"
      /> Harlan Wilton
    </footer>
  </div>
</template>
