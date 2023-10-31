import { ref } from 'vue'
import { appFetch } from './rpc'

export const data = ref<any>(null)

export async function refreshSources() {
  if (appFetch.value)
    data.value = await appFetch.value('/api/__sitemap__/debug')
}
