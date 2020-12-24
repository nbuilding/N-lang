export class FileLines {
  name: string
  lines: string[]
  lineNumWidth: number

  constructor (file: string, name: string = '<file>') {
    this.name = name
    this.lines = file.split(/\r?\n/)
    this.lineNumWidth = (this.lines.length + 1 + '').length
  }

  getLine (line: number): string {
    return this.lines[line - 1] || ''
  }
}
