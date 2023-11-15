import { withLeadingSlash } from 'ufo'
import { defineEventHandler } from '#imports'

export default defineEventHandler(() => {
  return $fetch<{ title: string }[]>('https://jsonplaceholder.typicode.com/posts').then((res) => {
    return res.map(post => ({
      invalidAttr: 'foo',
      loc: withLeadingSlash(post.title.replace(' ', '-')),
    }))
  })
})
