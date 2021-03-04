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
}
