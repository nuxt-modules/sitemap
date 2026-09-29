import type { ArrowFunctionExpression, Function as FunctionNode, Node } from 'oxc-parser'
import { parseSync } from 'oxc-parser'
import { getUndeclaredIdentifiersInFunction } from 'oxc-walker'

export interface ContentCallbackContext {
  collection: string
  kind: 'filter' | 'onUrl'
}

type CallbackNode = FunctionNode | ArrowFunctionExpression

// Names the server bundle always provides. `arguments` is local to every function.
const ALLOWED_GLOBALS = new Set([...Object.getOwnPropertyNames(globalThis), 'arguments', 'undefined'])

function isFunctionNode(node: Node | null | undefined): node is CallbackNode {
  return !!node && (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression')
}

/**
 * Parse the source of a callback as it will appear in the server bundle.
 *
 * `fn.toString()` gives `onUrl(url) { ... }` for a method shorthand, which is not an
 * expression. Wrapping the source in an object literal parses methods, arrows, and
 * function expressions alike, and the first property value is the function.
 */
function parseCallback(source: string): { expression: string, node: CallbackNode } | undefined {
  const asExpression = `(${source})`
  const direct = parseSync('callback.js', asExpression)
  if (!direct.errors.length) {
    const statement = direct.program.body[0]
    const node = statement?.type === 'ExpressionStatement' ? statement.expression : undefined
    const fn = node?.type === 'ParenthesizedExpression' ? node.expression : node
    if (isFunctionNode(fn))
      return { expression: asExpression, node: fn }
  }
  const asMethod = `({ ${source} })`
  const method = parseSync('callback.js', asMethod)
  if (method.errors.length)
    return undefined
  const statement = method.program.body[0]
  const node = statement?.type === 'ExpressionStatement' ? statement.expression : undefined
  const object = node?.type === 'ParenthesizedExpression' ? node.expression : node
  const property = object?.type === 'ObjectExpression' ? object.properties[0] : undefined
  if (property?.type !== 'Property' || !isFunctionNode(property.value))
    return undefined
  return { expression: `Object.values(${asMethod})[0]`, node: property.value }
}

/**
 * Turn a content `filter` or `onUrl` callback into source for the server bundle.
 *
 * The callback runs in the server bundle, apart from `content.config.ts`, so it can
 * only read its own parameters, its own locals, and globals. A callback that reads
 * an outer variable would throw a `ReferenceError` on every request, so this throws
 * at build time instead and names the variable.
 */
export function serializeContentCallback(fn: (...args: any[]) => unknown, ctx: ContentCallbackContext): string {
  const source = fn.toString()
  const parsed = parseCallback(source)
  if (!parsed)
    throw new Error(`[@nuxtjs/sitemap] Cannot read the \`${ctx.kind}\` callback of collection "${ctx.collection}". Use an arrow function, a function expression, or a method.`)

  const captured = [...new Set(getUndeclaredIdentifiersInFunction(parsed.node as any))]
    .filter(name => !ALLOWED_GLOBALS.has(name))
  if (captured.length) {
    const names = captured.map(name => `\`${name}\``).join(', ')
    throw new Error([
      `[@nuxtjs/sitemap] The \`${ctx.kind}\` callback of collection "${ctx.collection}" reads ${names} from outside the callback.`,
      `The callback is copied into the server bundle as source, so outer variables and imports do not exist there.`,
      `Move ${names} inside the callback.`,
    ].join(' '))
  }
  return parsed.expression
}
