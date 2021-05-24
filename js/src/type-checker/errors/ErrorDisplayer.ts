import colours from 'colors/safe'
import { Base } from '../../ast/index'
import { escapeHtml } from '../../utils/escape-html'
import { NType } from '../types/types'
import { displayErrorMessage, Error } from './Error'

/**
 * A type, a string (that will be enclosed in backticks), an ordinal, a list
 * (with a conjunction of your choosing), or using the singular or plural form
 * depending on the number.
 */
export type InlineDisplay =
  | NType
  | string
  | [number, 'th']
  | ['or' | 'and', string[]]
  | [string, number, string]
  | [string, 'link']

export type BlockDisplay = string | Base

export interface HtmlClassOptions {
  /** CSS class to use for variable and type names; default `n-error-name` */
  name: string

  /** CSS class to use for types; default `n-error-types` */
  types: string

  /**
   * CSS class to use for the file name and line:col position; default
   * `n-error-file-pos`
   */
  filePos: string

  /** CSS class to use for line numbers; default `n-error-line-num` */
  lineNum: string

  /** CSS class to use for the ^^^ underlines; default `n-error-underline` */
  underline: string

  /**
   * CSS class to use for highlighting errors in multiline code snippets;
   * default `n-error-multiline-highlight`
   */
  multilineHighlight: string

  /** CSS class for "Error"; default `n-error-error` */
  error: string

  /** CSS class for URLs */
  link: string
}

type ErrorDisplayColourOptions =
  | {
      type?: 'plain' | 'console-color'
    }
  | {
      type: 'html'
      classes?: HtmlClassOptions
    }

export type ErrorDisplayerOptions = ErrorDisplayColourOptions & {
  /** Minimum number of lines to show for multiline code snippets */
  previewMultiline?: number
}

export class ErrorDisplayer {
  options: ErrorDisplayerOptions

  constructor (options: ErrorDisplayerOptions = {}) {
    this._displayLine = this._displayLine.bind(this)

    this.options = options
  }

  private _displayInline (inline: InlineDisplay): string {
    if (Array.isArray(inline)) {
      if (inline[1] === 'th') {
        const [ordinal] = inline
        switch (ordinal) {
          case 1:
            return 'first'
          case 2:
            return 'second'
          case 3:
            return 'third'
          default:
            return ordinal + 'th'
        }
      } else if (inline[1] === 'link') {
        return `<${
          this.options.type === 'console-color'
            ? colours.underline(colours.blue(inline[0]))
            : this.options.type === 'html'
            ? `<span class="${this.options.classes?.link ??
                'n-error-link'}">${escapeHtml(inline[0])}</span>`
            : inline[0]
        }>`
      } else if (inline.length === 3) {
        return inline[1] === 1 ? inline[0] : `${inline[1]} ${inline[2]}`
      } else {
        const [conjunction, items] = inline
        if (items.length === 1) {
          return items[0]
        } else if (items.length === 2) {
          return `${items[0]} ${conjunction} ${items[1]}`
        } else {
          // OXFORD COMMA
          return `${items.slice(0, -1).join(', ')},  ${conjunction} ${
            items[items.length - 1]
          }`
        }
      }
    } else if (typeof inline === 'string') {
      const str = '`' + inline + '`'
      return this.options.type === 'console-color'
        ? colours.cyan(str)
        : this.options.type === 'html'
        ? `<span class="${this.options.classes?.name ??
            'n-error-name'}">${escapeHtml(str)}</span>`
        : str
    } else {
      const str = '' // '`' + displayType(inline) + '`' // TODO
      return this.options.type === 'console-color'
        ? colours.yellow(str)
        : this.options.type === 'html'
        ? `<span class="${this.options.classes?.types ??
            'n-error-types'}">${escapeHtml(str)}</span>`
        : str
    }
  }

  private _displayLine (
    strings: TemplateStringsArray,
    ...items: InlineDisplay[]
  ): string {
    let displayed = ''
    strings.forEach((item, i) => {
      displayed += this.options.type === 'html' ? escapeHtml(item) : item
      if (i < strings.length - 1) {
        displayed += this._displayInline(items[i])
      }
    })
    return displayed
  }

  private _displayLineNum (lineNumLength: number, lineNum: number): string {
    const displayed = ` ${lineNum.toString().padStart(lineNumLength, ' ')} | `
    return this.options.type === 'console-color'
      ? colours.cyan(displayed)
      : this.options.type === 'html'
      ? `<span class="${this.options.classes?.lineNum ??
          'n-error-line-num'}">${displayed}</span>`
      : displayed
  }

  private _displayUnderline (
    lines: string[],
    line: number,
    col: number | null,
    endCol: number | null,
  ): string {
    const lineNumLength = lines.length.toString().length
    const underline =
      (col !== null ? '' : '... ') +
      '^'.repeat((endCol ?? lines[line - 1].length + 1) - (col ?? 1)) +
      (endCol !== null ? '' : ' ...')
    const displayed =
      this.options.type === 'console-color'
        ? colours.red(underline)
        : this.options.type === 'html'
        ? `<span class="${this.options.classes?.underline ??
            'n-error-underline'}">${underline}</span>`
        : underline
    return ' '.repeat(lineNumLength + (col !== null ? 3 + col : 0)) + displayed
  }

  private _displayMultilineHighlight (text: string): string {
    return this.options.type === 'console-color'
      ? colours.red(text)
      : this.options.type === 'html'
      ? `<span class="${this.options.classes?.multilineHighlight ??
          'n-error-multiline-highlight'}">${escapeHtml(text)}</span>`
      : text
  }

  private _displayCode (fileName: string, lines: string[], base: Base): string {
    const lineNumLength = lines.length.toString().length
    let displayed = `  --> ${fileName}:${base.line}:${base.col}\n`
    displayed =
      this.options.type === 'console-color'
        ? colours.blue(displayed)
        : this.options.type === 'html'
        ? `<span class="${this.options.classes?.filePos ??
            'n-error-file-pos'}">${escapeHtml(displayed)}</span>`
        : displayed
    if (base.line === base.endLine) {
      displayed +=
        this._displayLineNum(lineNumLength, base.line) +
        lines[base.line - 1] +
        '\n' +
        this._displayUnderline(lines, base.line, base.col, base.endCol)
    } else {
      displayed +=
        this._displayLineNum(lineNumLength, base.line) +
        lines[base.line - 1].slice(0, base.col - 1) +
        this._displayMultilineHighlight(
          lines[base.line - 1].slice(base.col - 1),
        ) +
        '\n' +
        this._displayUnderline(lines, base.line, base.col, null)
      const previewLines = this.options.previewMultiline ?? 2
      if (base.endLine - base.line + 1 > (previewLines + 1) * 2) {
        for (
          let line = base.line + 1;
          line <= base.line + previewLines;
          line++
        ) {
          displayed +=
            '\n' +
            this._displayLineNum(lineNumLength, line) +
            this._displayMultilineHighlight(lines[line - 1])
        }
        const ellipses =
          lineNumLength > 1
            ? `\n${' '.repeat(lineNumLength - 2)}... |`
            : '\n.. |'
        displayed +=
          this.options.type === 'console-color'
            ? colours.cyan(ellipses)
            : this.options.type === 'html'
            ? `<span class="${this.options.classes?.lineNum ??
                'n-error-line-num'}">${ellipses}</span>`
            : ellipses
        for (
          let line = base.endLine - previewLines;
          line < base.endLine;
          line++
        ) {
          displayed +=
            '\n' +
            this._displayLineNum(lineNumLength, line) +
            this._displayMultilineHighlight(lines[line - 1])
        }
      } else {
        for (let line = base.line + 1; line < base.endLine; line++) {
          displayed +=
            '\n' +
            this._displayLineNum(lineNumLength, line) +
            this._displayMultilineHighlight(lines[line - 1])
        }
      }
      displayed +=
        '\n' +
        this._displayLineNum(lineNumLength, base.endLine) +
        this._displayMultilineHighlight(
          lines[base.endLine - 1].slice(0, base.endCol - 1),
        ) +
        lines[base.endLine - 1].slice(base.endCol - 1) +
        '\n' +
        this._displayUnderline(lines, base.endLine, null, base.endCol)
    }
    return displayed
  }

  displayError (fileName: string, lines: string[], error: Error): string {
    const rawBlocks = displayErrorMessage(error, this._displayLine)
    const blocks: BlockDisplay[] = Array.isArray(rawBlocks)
      ? rawBlocks.filter((block): block is BlockDisplay => !!block)
      : [rawBlocks, error.base]
    let str =
      this.options.type === 'console-color'
        ? colours.bold(colours.red('Error'))
        : this.options.type === 'html'
        ? `<span class="${this.options.classes?.error ??
            'n-error-error'}">Error</span>`
        : 'Error'
    str += ': '
    let firstLine = true
    for (const block of blocks) {
      if (!firstLine) {
        str += '\n\n'
      }
      if (typeof block === 'string') {
        str += block
      } else {
        str += this._displayCode(fileName, lines, block)
      }
      firstLine = false
    }
    return str
  }
}
