import { useDevtoolsConnection } from 'nuxtseo-layer-devtools/composables/rpc'
import { refreshSources } from './state'

useDevtoolsConnection({
  onConnected: () => refreshSources(),
})
