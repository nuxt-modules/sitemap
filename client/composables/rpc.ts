import { onDevtoolsClientConnected } from '@nuxt/devtools-kit/iframe-client'
import type { $Fetch } from 'nitropack'
import { ref } from 'vue'
import type { NuxtDevtoolsClient } from '@nuxt/devtools-kit/dist/types'
import { refreshSources } from './state'

export const appFetch = ref<$Fetch>()

export const devtools = ref<NuxtDevtoolsClient>()

onDevtoolsClientConnected(async (client) => {
  appFetch.value = client.host.app.$fetch
  devtools.value = client.devtools
  refreshSources()
})
