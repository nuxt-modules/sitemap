import { describe, expect, it } from 'vitest'
import { escapeValueForXml } from '../../src/runtime/server/sitemap/builder/xml'
import { XmlStringBuilder } from '../../src/runtime/server/sitemap/builder/string-builder'

describe('XML performance optimizations', () => {
  describe('escapeValueForXml', () => {
    it('should use fast path for strings without special characters', () => {
      const result = escapeValueForXml('normal text')
      expect(result).toBe('normal text')
    })

    it('should escape special characters correctly', () => {
      expect(escapeValueForXml('text & more')).toBe('text &amp; more')
      expect(escapeValueForXml('<tag>')).toBe('&lt;tag&gt;')
      expect(escapeValueForXml('"quoted"')).toBe('&quot;quoted&quot;')
      expect(escapeValueForXml('it\'s')).toBe('it&apos;s')
    })

    it('should handle boolean values', () => {
      expect(escapeValueForXml(true)).toBe('yes')
      expect(escapeValueForXml(false)).toBe('no')
    })

    it('should handle numbers', () => {
      expect(escapeValueForXml(123)).toBe('123')
      expect(escapeValueForXml(0)).toBe('0')
    })
  })

  describe('XmlStringBuilder', () => {
    it('should efficiently build strings', () => {
      const builder = new XmlStringBuilder()
      builder.append('<root>')
      builder.appendLine()
      builder.append('  <child>test</child>')
      builder.appendLine()
      builder.append('</root>')

      const result = builder.toString()
      expect(result).toBe('<root>\n  <child>test</child>\n</root>')
    })

    it('should handle empty builder', () => {
      const builder = new XmlStringBuilder()
      expect(builder.toString()).toBe('')
      expect(builder.length).toBe(0)
    })

    it('should track size correctly', () => {
      const builder = new XmlStringBuilder()
      builder.append('hello')
      expect(builder.length).toBe(5)
      builder.append(' world')
      expect(builder.length).toBe(11)
    })
  })
})
