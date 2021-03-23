import colours from 'colors/safe'
import util from 'util'

import { displayType } from '../utils/display-type'

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

  diff (other: this, path = '.'): BaseDiff[] {
    if (this.constructor !== other.constructor) {
      return [{ path, this: this.toString(), other: other.toString() }]
    }
    const issues = []
    for (const key in this) {
      if (ignoredDiffKeys.includes(key)) continue
      const propPath = `${path}/${this.constructor.name}.${key}`
      const value = this[key]
      const otherValue = other[key]
      issues.push(...diffValues(propPath, value, otherValue))
    }
    return issues
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

export interface BaseDiff {
  path: string
  this: string
  other: string
}

const ignoredDiffKeys = ['line', 'col', 'endLine', 'endCol', 'children']

function diffValues (path: string, one: any, other: any): BaseDiff[] {
  const issues = []
  if (typeof one === 'string' && typeof other === 'string') {
    if (one !== other) {
      return [{ path, this: one, other }]
    }
  } else if (typeof one === 'boolean' && typeof other === 'boolean' || typeof one === 'number' && typeof other === 'number') {
    if (one !== other) {
      return [{ path, this: one.toString(), other: other.toString() }]
    }
  } else if (Array.isArray(one) && Array.isArray(other)) {
    if (one.length !== other.length) {
      return [{
        path,
        this: `${one.length} item(s):\n${one.join('\n')}`,
        other: `${other.length} item(s):\n${other.join('\n')}`
      }]
    }
    for (let i = 0; i < one.length; i++) {
      issues.push(...diffValues(`${path}[${i}]`, one[i], other[i]))
    }
  } else if (one instanceof Base && other instanceof Base) {
    return one.diff(other)
  } else if (typeof one === 'function' && typeof other === 'function') {
    return []
  } else {
    throw new TypeError(`I do not know how to diff these types: ${displayType(one)} vs ${displayType(other)}`)
  }
  return issues
}

export class DiffError extends Error {
  constructor (diffs: BaseDiff[]) {
    super(diffs.map(DiffError.display).join('\n\n'))
    this.name = this.constructor.name
  }

  static display (diff: BaseDiff): string {
    return [
      colours.bold(colours.white(diff.path)),
      colours.cyan(diff.this),
      colours.magenta(diff.other),
    ].join('\n')
  }
}
