// Minimal throughput benchmark for @nuxtjs/sitemap
// Usage:
//   node benchmark/bench.mjs              # all variants
//   BENCH_TARGET=/api/ping node benchmark/bench.mjs
//
// Each run gets its own .output dir so builds cannot leak between runs.
// After each build we assert presence/absence of sitemap module artefacts.

import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import autocannon from 'autocannon'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cwd = __dirname

const TARGET = process.env.BENCH_TARGET || '/api/ping'
const PORT = Number(process.env.BENCH_PORT || 3777)
const DURATION = Number(process.env.BENCH_DURATION || 10)
const CONNECTIONS = Number(process.env.BENCH_CONNECTIONS || 100)

const SITEMAP_ARTEFACTS = [
  'chunks/routes/sitemap.xml.mjs',
  'chunks/virtual/global-sources.mjs',
  'chunks/virtual/child-sources.mjs',
]
// strings that must NOT appear in baseline server bundle and SHOULD appear with sitemap on
const SITEMAP_MARKERS = ['@nuxtjs/sitemap', 'useSitemapRuntimeConfig', '#sitemap-virtual']

function isolate(label) {
  const slug = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  return {
    nuxtDir: resolve(cwd, `.nuxt-${slug}`),
    outDir: resolve(cwd, `.output-${slug}`),
  }
}

function assertSitemapPresence({ outDir, expectSitemap, label }) {
  const indexPath = resolve(outDir, 'server/index.mjs')
  if (!existsSync(indexPath))
    throw new Error(`[${label}] missing build: ${indexPath}`)

  const presentArtefacts = SITEMAP_ARTEFACTS.filter(p => existsSync(resolve(outDir, 'server', p)))

  const grepOut = []
  const walker = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) {
        walker(full)
      }
      else if (entry.name.endsWith('.mjs')) {
        const txt = readFileSync(full, 'utf8')
        for (const m of SITEMAP_MARKERS) {
          if (txt.includes(m))
            grepOut.push(`${full.slice(outDir.length + 1)}: ${m}`)
        }
      }
    }
  }
  walker(resolve(outDir, 'server'))

  console.log(`[${label}] sitemap artefacts present: ${presentArtefacts.length} -> ${JSON.stringify(presentArtefacts)}`)
  console.log(`[${label}] sitemap marker hits in bundle: ${grepOut.length}`)
  if (grepOut.length)
    console.log(grepOut.slice(0, 5).map(l => `  - ${l}`).join('\n'))

  if (expectSitemap) {
    if (grepOut.length === 0)
      throw new Error(`[${label}] expected sitemap markers but found none`)
  }
  else {
    if (presentArtefacts.length > 0)
      throw new Error(`[${label}] BASELINE LEAK: sitemap artefacts present: ${JSON.stringify(presentArtefacts)}`)
    if (grepOut.length > 0)
      throw new Error(`[${label}] BASELINE LEAK: sitemap markers found in baseline bundle:\n${grepOut.slice(0, 10).join('\n')}`)
  }
}

async function run(label, env, expectSitemap) {
  const { nuxtDir, outDir } = isolate(label)
  console.log(`\n=== ${label} ===`)
  console.log(`env: ${JSON.stringify(env)}`)
  console.log(`nuxtDir: ${nuxtDir}`)
  console.log(`outDir:  ${outDir}`)

  // wipe per-run dirs
  for (const d of [nuxtDir, outDir]) rmSync(d, { recursive: true, force: true })

  console.log('building...')
  const slug = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const build = spawn(
    'npx',
    ['nuxt', 'build'],
    {
      cwd,
      env: {
        ...process.env,
        ...env,
        BENCH_SLUG: slug,
        NUXT_TELEMETRY_DISABLED: '1',
      },
      stdio: 'inherit',
    },
  )
  const [code] = await once(build, 'exit')
  if (code !== 0)
    throw new Error(`build failed (${code})`)

  await assertSitemapPresence({ outDir, expectSitemap, label })

  const server = spawn('node', [resolve(outDir, 'server/index.mjs')], {
    cwd,
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let ready = false
  server.stdout.on('data', (b) => {
    const s = String(b)
    process.stdout.write(`[server] ${s}`)
    if (/Listening/.test(s))
      ready = true
  })
  server.stderr.on('data', b => process.stderr.write(`[server] ${b}`))

  for (let i = 0; i < 200 && !ready; i++) await sleep(100)
  if (!ready) {
    server.kill('SIGKILL')
    throw new Error('server failed to start')
  }
  await sleep(200)

  console.log(`benchmarking http://127.0.0.1:${PORT}${TARGET} for ${DURATION}s, ${CONNECTIONS} conns`)
  const result = await autocannon({
    url: `http://127.0.0.1:${PORT}${TARGET}`,
    connections: CONNECTIONS,
    duration: DURATION,
  })

  server.kill('SIGTERM')
  await once(server, 'exit').catch(() => {})

  return {
    label,
    rps: result.requests.average,
    rpsMin: result.requests.min,
    rpsMax: result.requests.max,
    latencyAvg: result.latency.average,
    latencyP99: result.latency.p99,
    errors: result.errors,
    non2xx: result.non2xx,
  }
}

const runs = []
runs.push(await run('baseline-no-sitemap', { BENCH_SITEMAP: '0' }, false))
runs.push(await run('sitemap-default', { BENCH_SITEMAP: '1', BENCH_WARMUP: '1' }, true))
runs.push(await run('sitemap-no-warmup', { BENCH_SITEMAP: '1', BENCH_WARMUP: '0' }, true))
runs.push(await run('sitemap-no-xsl', { BENCH_SITEMAP: '1', BENCH_WARMUP: '0', BENCH_XSL: '0' }, true))
runs.push(await run('sitemap-zero-runtime', { BENCH_SITEMAP: '1', BENCH_WARMUP: '0', BENCH_ZERO: '1' }, true))
runs.push(await run('sitemap-rc-stub', { BENCH_SITEMAP: '1', BENCH_WARMUP: '0', BENCH_RC_STUB: '1' }, true))

console.log('\n=== summary ===')
console.table(runs.map(r => ({
  'label': r.label,
  'req/s avg': r.rps.toFixed(0),
  'req/s min': r.rpsMin.toFixed(0),
  'req/s max': r.rpsMax.toFixed(0),
  'lat avg ms': r.latencyAvg.toFixed(2),
  'lat p99 ms': r.latencyP99.toFixed(2),
  'errors': r.errors,
  'non2xx': r.non2xx,
})))
