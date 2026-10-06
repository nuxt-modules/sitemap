import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:net'

const portServer = createServer()
portServer.listen(0, '127.0.0.1')
await once(portServer, 'listening')
const port = portServer.address().port
portServer.close()
await once(portServer, 'close')

const origin = `http://127.0.0.1:${port}`
const nitroManifest = JSON.parse(await readFile(new URL('.output/nitro.json', import.meta.url), 'utf8'))
assert.equal(nitroManifest.versions.nitro, '3.0.260903-beta')

const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  cwd: import.meta.dirname,
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port) },
  stdio: 'inherit',
})

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`Nuxt 5 server exited with code ${server.exitCode}`)
    const response = await fetch(`${origin}/sitemap.xml`, {
      signal: AbortSignal.timeout(1_000),
    }).catch(() => null)
    if (response?.ok)
      return response
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('Nuxt 5 server did not start')
}

try {
  const sitemap = await (await waitForServer()).text()
  assert.doesNotMatch(sitemap, /<loc>[^<]*\/excluded<\/loc>/)
  assert.match(sitemap, /https:\/\/nuxt5\.example\.com\/included/)
  assert.match(sitemap, /https:\/\/nuxt5\.example\.com\/authenticated-source/)
  // served by the `pages/` directory scan
  assert.match(sitemap, /<loc>https:\/\/nuxt5\.example\.com\/<\/loc>/)
  const routeRule = await fetch(`${origin}/api/compat`).then(response => response.json())
  assert.deepEqual(routeRule, { sitemap: false })
}
finally {
  server.kill()
  if (server.exitCode === null)
    await once(server, 'exit')
}
