import type { HighlighterCore } from 'shiki'
import type { MaybeRef } from 'vue'
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { computed, ref, toValue } from 'vue'
import { devtools } from './rpc'

export const shiki = ref<HighlighterCore>()

export function loadShiki() {
  // Only loading when needed
  return createHighlighterCore({
    themes: [
      import('@shikijs/themes/vitesse-light'),
      import('@shikijs/themes/vitesse-dark'),
    ],
    langs: [
      import('@shikijs/langs/json'),
    ],
    engine: createJavaScriptRegexEngine(),
  }).then((i) => {
    shiki.value = i
  })
}

export function useRenderCodeHighlight(code: MaybeRef<string>, lang: 'json') {
  return computed(() => {
    const colorMode = devtools.value?.colorMode || 'light'
    return shiki.value!.codeToHtml(toValue(code), {
      lang,
      theme: colorMode === 'dark' ? 'vitesse-dark' : 'vitesse-light',
    }) || ''
  })
}
