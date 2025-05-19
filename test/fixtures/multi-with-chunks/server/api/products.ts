export default defineEventHandler(() => {
  // Generate 25 products to test chunking with chunkSize: 10 (should create 3 chunks)
  return Array.from({ length: 25 }, (_, i) => ({
    loc: `/products/${i + 1}`,
    lastmod: new Date(2024, 1, i + 1).toISOString(),
  }))
})
