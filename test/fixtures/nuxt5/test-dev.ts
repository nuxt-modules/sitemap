import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { join } from 'node:path'

const portServer = createServer()
portServer.listen(0, '127.0.0.1')
await once(portServer, 'listening')
const address = portServer.address()
assert(address && typeof address !== 'string')
const port = address.port
portServer.close()
await once(portServer, 'close')

const origin = `http://127.0.0.1:${port}`
const pagePath = `/sitemap-dev-${process.pid}`
const pageFile = join(import.meta.dirname, 'pages', `${pagePath.slice(1)}.vue`)
let log = ''
const server = spawn('pnpm', ['exec', 'nuxt', 'dev', '--port', String(port), '--host', '127.0.0.1'], {
  cwd: import.meta.dirname,
  detached: process.platform !== 'win32',
  env: { ...process.env, CHOKIDAR_USEPOLLING: 'true', NUXT_TELEMETRY_DISABLED: '1' },
})
const exited = once(server, 'exit')
server.stdout.on('data', (chunk) => {
  log += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  log += chunk.toString()
})
const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

async function waitFor(path: string, accepts: (body: string) => boolean, timeout = 20_000): Promise<string> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(`Development server exited with code ${server.exitCode}.\n${log}`)
    const body = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(1_000) })
      .then(async response => response.ok ? response.text() : undefined)
      .catch((error: unknown) => {
        // Startup and hot reload briefly close the listener or invalidate server modules.
        if (error instanceof TypeError || (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)))
          return undefined
        throw error
      })
    if (body && accepts(body))
      return body
    await pause(100)
  }
  throw new Error(`Development response did not settle for ${path}.\n${log}`)
}

function stop(signal: NodeJS.Signals) {
  if (!server.pid)
    return
  if (process.platform === 'win32') {
    server.kill(signal)
    return
  }
  try {
    process.kill(-server.pid, signal)
  }
  catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ESRCH'))
      throw error
  }
}

try {
  const initial = await waitFor('/sitemap.xml', body => body.includes('<urlset') && /<loc>[^<]+\/<\/loc>/.test(body), 60_000)
  assert.match(initial, /\/included<\/loc>/)
  assert.doesNotMatch(initial, /\/excluded<\/loc>/)

  await writeFile(pageFile, '<template><main>Sitemap development page</main></template>')
  await waitFor(pagePath, body => body.includes('Sitemap development page'))
  await waitFor('/sitemap.xml', body => body.includes(`${pagePath}</loc>`))

  await rm(pageFile)
  await waitFor('/sitemap.xml', body => body.includes('<urlset') && !body.includes(`${pagePath}</loc>`))
  console.info('Nuxt 5 development sitemap and page updates passed.')
}
finally {
  await rm(pageFile, { force: true })
  stop('SIGTERM')
  await Promise.race([exited, pause(5_000)])
  stop('SIGKILL')
  await exited
}
