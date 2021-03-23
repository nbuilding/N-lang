import { ParseOptions, parse } from '../grammar/parse'
import { Block } from '../ast/index'

export interface FileLinesOptions {}

export class FileLines {
  name: string
  lines: string[]
  lineNumWidth: number

  constructor (file: string, name: string = '<file>', _: FileLinesOptions = {}) {
    this.name = name
    this.lines = file.split(/\r?\n/)
    this.lineNumWidth = (this.lines.length + 1 + '').length
  }

  getLine (line: number): string {
    return this.lines[line - 1] || ''
  }

  parse (options: ParseOptions = {}): Block {
    return parse(this.toString(), options)
  }

  toString (): string {
    return this.lines.join('\n')
  }
}
