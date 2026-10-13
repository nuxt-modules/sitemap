import assert from 'node:assert/strict'

export async function assertRouteRules(origin: string) {
  const response = await fetch(`${origin}/api/route-rules`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    config: { priority: 0.3, changefreq: 'yearly' },
    resolved: { priority: 0.3, changefreq: 'yearly' },
  })
}
