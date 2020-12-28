import colours from 'colors/safe'

import * as ast from '../grammar/ast'
import { Module, nativeModules } from './modules'
import NType, { display } from './n-type'
import { TopLevelScope } from './scope'
import { FileLines } from './display-lines'

export { FileLines }

export interface Warning {
  base: ast.Base
  message: string
  options?: WarningOptions
}

interface WarningOptions {
  exit?: ast.Base
}

enum WarningType {
  Error,
  Warning,
}

export interface CheckerOptions {
  colours?: boolean
}

export class TypeChecker {
  types: Map<ast.Base, NType>
  errors: Warning[]
  warnings: Warning[]
  options: CheckerOptions
  global: TopLevelScope

  constructor (options: CheckerOptions = {}) {
    this.types = new Map()
    this.errors = []
    this.warnings = []
    this.options = options
    this.global = new TopLevelScope(this)
  }

  err (base: ast.Base, message: string, options?: WarningOptions) {
    this.errors.push({ base, message, options })
  }

  warn (base: ast.Base, message: string, options?: WarningOptions) {
    this.warnings.push({ base, message, options })
  }

  check (ast: ast.Block) {
    const scope = this.global.newScope()
    scope.checkStatementType(ast)
    scope.endScope()
  }

  getModule (moduleName: string): Module | undefined {
    return nativeModules[moduleName]
  }

  displayType (type: NType): string {
    if (this.options.colours) {
      return colours.yellow(display(type))
    } else {
      return display(type)
    }
  }

  displayBase (file: FileLines, { line, col, endLine, endCol }: ast.Base): string {
    const header = this.options.colours
      ? ' '.repeat(file.lineNumWidth) + colours.cyan('-->') + ' ' +
        colours.blue(`${file.name}:${line}:${col}`) + '\n'
      : ' '.repeat(file.lineNumWidth) + `--> ${file.name}:${line}:${col}\n`
    if (line === endLine) {
      const output = this.options.colours
        ? colours.bold(colours.cyan(`${line.toString().padStart(file.lineNumWidth, ' ')} | `))
          + file.getLine(line) + '\n' + ' '.repeat(file.lineNumWidth + 2 + col)
          + colours.red('^'.repeat(endCol - col))
        : `${line.toString().padStart(file.lineNumWidth, ' ')} | ${file.getLine(line)}\n`
          + ' '.repeat(file.lineNumWidth + 2 + col) + '^'.repeat(endCol - col)
      return header + output
    } else {
      let lines = ''
      for (let l = line; l <= endLine; l++) {
        const lineContent = file.getLine(l)
        if (this.options.colours) {
          const text = l === line
            ? lineContent.slice(0, col - 1) + colours.red(lineContent.slice(col - 1))
            : l === endLine
            ? colours.red(lineContent.slice(0, endCol - 1)) + lineContent.slice(endCol - 1)
            : colours.red(lineContent)
          lines += colours.bold(colours.cyan(`${l.toString().padStart(file.lineNumWidth, ' ')} | `))
            + text
        } else {
          lines += `${l.toString().padStart(file.lineNumWidth, ' ')} | ${lineContent}`
        }
        if (l < endLine) {
          lines += '\n'
        }
      }
      return header + lines
    }
  }

  displayWarning (file: FileLines, type: WarningType, { base, message, options = {} }: Warning) {
    let output
    switch (type) {
      case WarningType.Error: {
        output = this.options.colours
          ? colours.bold(colours.red('Error'))
          : 'Error'
        break
      }
      case WarningType.Warning: {
        output = this.options.colours
          ? colours.bold(colours.yellow('Warning'))
          : 'Warning'
        break
      }
    }
    output += `: ${message}\n${this.displayBase(file, base)}`
    if (options.exit) {
      output += '\n The function exits here:\n'
        + this.displayBase(file, options.exit)
    }
    return output
  }

  displayWarnings (file: FileLines): string {
    let str = ''
    for (const warning of this.warnings) {
      str += this.displayWarning(file, WarningType.Warning, warning) + '\n'
    }
    for (const error of this.errors) {
      str += this.displayWarning(file, WarningType.Error, error) + '\n'
    }
    if (this.warnings.length || this.errors.length) {
      str += 'Compiled with '
      if (this.errors.length) {
        const plural = ' error' + (this.errors.length === 1 ? '' : 's')
        str += this.options.colours
          ? colours.red(colours.bold(this.errors.length + '') + plural)
          : this.errors.length + plural
      }
      if (this.warnings.length && this.errors.length) {
        str += ' and '
      }
      if (this.warnings.length) {
        const plural = ' warning' + (this.warnings.length === 1 ? '' : 's')
        str += this.options.colours
          ? colours.yellow(colours.bold(this.warnings.length + '') + plural)
          : this.warnings.length + plural
      }
      str += '.'
    }
    return str
  }
}
