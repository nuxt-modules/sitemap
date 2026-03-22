import { appFetch, colorMode, devtools, useDevtoolsConnection } from 'nuxtseo-shared/runtime/app/composables/rpc'
import { refreshSources } from './state'

export { appFetch, colorMode, devtools }

useDevtoolsConnection({
  onConnected: () => refreshSources(),
})
