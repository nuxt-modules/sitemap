import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
// Native Node verifies the public workspace export without a Vitest transform.
// eslint-disable-next-line test/no-import-node-test
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

test('parses through the public package export in a native Node process', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../test/fixtures/native-public.ts', import.meta.url))], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
  })
  assert.equal(result.stderr, '')
  assert.equal(result.status, 0)
  const parsed = JSON.parse(result.stdout)
  assert.equal(parsed._tag, 'document')
  assert.equal(parsed.document.entries[0].loc, 'https://example.com/native')
})
