import { spawn } from 'node:child_process'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', code => code === 0
      ? resolve()
      : reject(new Error(`${command} exited with code ${code}`)))
  })
}

const directory = await mkdtemp(join(tmpdir(), 'sitemapd-attw-'))

await run('pnpm', ['pack', '--pack-destination', directory])
  .then(async () => {
    const archive = (await readdir(directory)).find(file => file.endsWith('.tgz'))
    if (!archive)
      throw new Error('pnpm pack did not produce an archive')
    await run('attw', [join(directory, archive)])
  })
  .finally(() => rm(directory, { recursive: true, force: true }))
