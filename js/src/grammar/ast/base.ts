import util from 'util'

export interface BasePosition {
  line: number
  col: number
  endLine: number
  endCol: number
}
function posHas (
  { line: startLine, col: startCol, endLine, endCol }: BasePosition,
  line: number,
  col: number,
): boolean {
  if (line > startLine && line < endLine) {
    return true
  } else if (line === startLine) {
    if (col < startCol) return false
    return line === endLine ? col <= endCol : true
  } else if (line === endLine) {
    return col <= endCol
  } else {
    return false
  }
}

export class Base {
  line: number
  col: number
  endLine: number
  endCol: number
  children: Base[]

  constructor ({ line, col, endLine, endCol }: BasePosition, children: Base[] = []) {
    this.line = line
    this.col = col
    this.endLine = endLine
    this.endCol = endCol
    this.children = children
  }

  find (line: number, col: number): Base[] {
    if (posHas(this, line, col)) {
      const bases: Base[] = []
      for (const base of this.children) {
        if (posHas(base, line, col)) {
          bases.push(...base.find(line, col))
        }
      }
      bases.push(this)
      return bases
    } else {
      return []
    }
  }

  toString () {
    return `[undisplayable ${this.constructor.name}]`
  }

  // Make the output of util.inspect cleaner
  [util.inspect.custom] (): any {
    const obj: any = { ...this }
    // Sets a hidden value
    Object.defineProperty(obj, 'constructor', {
      value: this.constructor
    })
    delete obj.line
    delete obj.col
    delete obj.endLine
    delete obj.endCol
    delete obj.children
    return obj
  }
}
