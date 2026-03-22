import { appFetch, colorMode, devtools, useDevtoolsConnection } from 'nuxtseo-shared/client/composables/rpc'
import { refreshSources } from './state'

export { appFetch, colorMode, devtools }

useDevtoolsConnection({
  onConnected: () => refreshSources(),
})
