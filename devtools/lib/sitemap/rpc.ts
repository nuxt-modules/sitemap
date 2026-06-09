import { useDevtoolsConnection } from 'nuxtseo-layer-devtools/composables/rpc'

// The layer refreshes data on connect and on every host route change, so sitemap
// needs no module-level host access.
useDevtoolsConnection()
