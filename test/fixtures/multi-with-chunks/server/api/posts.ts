export default defineEventHandler(() => {
  // Generate 12 posts to test chunking with chunkSize: 3 (should create 4 chunks)
  return Array.from({ length: 12 }, (_, i) => ({
    loc: `/posts/${i + 1}`,
    lastmod: new Date(2024, 0, i + 1).toISOString(),
  }))
})
