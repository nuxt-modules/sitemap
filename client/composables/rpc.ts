import { onDevtoolsClientConnected } from '@nuxt/devtools-kit/iframe-client'
import type { $Fetch } from 'ofetch'
import { ref, watchEffect } from 'vue'
import type { NuxtDevtoolsClient } from '@nuxt/devtools-kit/types'
import { refreshSources } from './state'

export const appFetch = ref<$Fetch>()

export const devtools = ref<NuxtDevtoolsClient>()

export const colorMode = ref<'dark' | 'light'>()

onDevtoolsClientConnected(async (client) => {
  appFetch.value = client.host.app.$fetch
  watchEffect(() => {
    colorMode.value = client.host.app.colorMode.value
  })
  devtools.value = client.devtools
  refreshSources()
})
