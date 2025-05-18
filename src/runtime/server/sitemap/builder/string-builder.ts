// Fast string builder for XML generation
export class XmlStringBuilder {
  private chunks: string[] = []
  private size = 0

  append(str: string): this {
    this.chunks.push(str)
    this.size += str.length
    return this
  }

  appendLine(str: string = ''): this {
    return this.append(str + '\n')
  }

  toString(): string {
    // Fast path for single chunk
    if (this.chunks.length === 0) return ''
    if (this.chunks.length === 1) return this.chunks[0]

    // Join all chunks efficiently
    return this.chunks.join('')
  }

  clear(): void {
    this.chunks.length = 0
    this.size = 0
  }

  get length(): number {
    return this.size
  }
}
