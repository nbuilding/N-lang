import colours from 'colors/safe'
import { generateNames } from '../../../test/unit/utils/generate-names'
import { Base } from '../../ast/index'
import { escapeHtml } from '../../utils/escape-html'
import { findLastIndex } from '../../utils/find-last-index'
import {
  ComparisonResult,
  ComparisonResultType,
  typeToResultType,
} from '../types/comparisons'
import { NType } from '../types/types'
import { displayErrorMessage, Error } from './Error'
import { displayWarningMessage, Warning } from './Warning'

class TypeNameCache {
  funcTypeVarNames: Map<string, string> = new Map()
  generator?: Generator<string, never>

  getFuncTypeVarNameForId (id: string): string {
    let name = this.funcTypeVarNames.get(id)
    if (!name) {
      if (!this.generator) {
        this.generator = generateNames()
      }
      // TODO: Currently not intelligent and can suggest duplicate names with
      // existing type names. Disambiguating type names will have to be more
      // clever.
      name = this.generator.next().value
      this.funcTypeVarNames.set(id, name)
    }
    return name
  }
}

export const HINT = { keyword: 'hint' } as const

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
  | typeof HINT

export type BlockDisplay = string | Base | ComparisonResult

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

  /** CSS class of "Warning"; default `n-error-warning` */
  warning: string

  /** CSS class for URLs; default `n-error-link` */
  link: string

  /** CSS class for the "Hint" word in hints; default `n-error-hint` */
  hint: string

  /** CSS class for type error notes; default `n-error-type-error` */
  typeError: string
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
  indent?: string | number
}

export class ErrorDisplayer {
  options: ErrorDisplayerOptions

  constructor (options: ErrorDisplayerOptions = {}) {
    this._displayLine = this._displayLine.bind(this)

    this.options = options
  }

  private get _indent (): string {
    if (typeof this.options.indent === 'string') {
      return this.options.indent
    } else if (typeof this.options.indent === 'number') {
      return ' '.repeat(this.options.indent)
    } else {
      return '  '
    }
  }

  private get _hint (): string {
    return this.options.type === 'console-color'
      ? colours.green('Hint')
      : this.options.type === 'html'
      ? `<span class="${this.options.classes?.hint ??
          'n-error-hint'}">Hint</span>`
      : 'Hint'
  }

  private _displayInlineCode (code: string): string {
    const str = '`' + code + '`'
    return this.options.type === 'console-color'
      ? colours.cyan(str)
      : this.options.type === 'html'
      ? `<span class="${this.options.classes?.name ??
          'n-error-name'}">${escapeHtml(str)}</span>`
      : str
  }

  private _displayList (conjunction: string, items: string[]): string {
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

  private _displayLink (url: string): string {
    return `<${
      this.options.type === 'console-color'
        ? colours.underline(colours.blue(url))
        : this.options.type === 'html'
        ? `<span class="${this.options.classes?.link ??
            'n-error-link'}">${escapeHtml(url)}</span>`
        : url
    }>`
  }

  private _displayInlineTypePretty (type: ComparisonResult): string {
    const str = '`' + this._displayInlineType(type) + '`'
    return this.options.type === 'console-color'
      ? colours.yellow(str)
      : this.options.type === 'html'
      ? `<span class="${this.options.classes?.types ??
          'n-error-types'}">${escapeHtml(str)}</span>`
      : str
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
        return this._displayLink(inline[0])
      } else if (inline.length === 3) {
        return inline[1] === 1 ? inline[0] : `${inline[1]} ${inline[2]}`
      } else {
        const [conjunction, items] = inline
        return this._displayList(conjunction, items)
      }
    } else if (typeof inline === 'string') {
      return this._displayInlineCode(inline)
    } else if ('keyword' in inline) {
      return this._hint
    } else {
      return this._displayInlineTypePretty(typeToResultType(inline))
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
    length: number,
    { prefix = '', suffix = '' }: { prefix?: string; suffix?: string } = {},
  ): string {
    const underline = prefix + '^'.repeat(length) + suffix
    return this.options.type === 'console-color'
      ? colours.red(underline)
      : this.options.type === 'html'
      ? `<span class="${this.options.classes?.underline ??
          'n-error-underline'}">${underline}</span>`
      : underline
  }

  private _displayUnderlineForLine (
    lines: string[],
    line: number,
    col: number | null,
    endCol: number | null,
  ): string {
    const lineNumLength = lines.length.toString().length
    return (
      ' '.repeat(lineNumLength + 1) +
      (col !== null
        ? '   ' + lines[line - 1].slice(0, col - 1).replace(/[^\t]/g, ' ')
        : '') +
      this._displayUnderline(
        (endCol ?? lines[line - 1].length + 1) - (col ?? 1),
        {
          prefix: col !== null ? '' : '... ',
          suffix: endCol !== null ? '' : ' ...',
        },
      )
    )
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
        this._displayUnderlineForLine(lines, base.line, base.col, base.endCol)
    } else {
      displayed +=
        this._displayLineNum(lineNumLength, base.line) +
        lines[base.line - 1].slice(0, base.col - 1) +
        this._displayMultilineHighlight(
          lines[base.line - 1].slice(base.col - 1),
        ) +
        '\n' +
        this._displayUnderlineForLine(lines, base.line, base.col, null)
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
        this._displayUnderlineForLine(lines, base.endLine, null, base.endCol)
    }
    return displayed
  }

  private _displayInlineType (
    type: ComparisonResultType,
    cache = new TypeNameCache(),
    inParens = false,
  ): string {
    let display
    if (type.type === 'named') {
      display = `${type.name}${
        type.vars.length > 0
          ? `[${type.vars
              .map(typeVar =>
                this._displayInlineType(
                  typeVar,
                  cache,
                  typeVar.type === 'tuple',
                ),
              )
              .join(', ')}]`
          : ''
      }`
    } else if (type.type === 'unit') {
      display = '()'
    } else if (type.type === 'func-type-var') {
      display = cache.getFuncTypeVarNameForId(type.id)
    } else if (type.type === 'union') {
      display = type.typeNames.join(' | ')
    } else if (type.type === 'record') {
      const entries = Object.entries(type.types)
      display =
        entries.length > 0
          ? `{ ${entries
              .map(
                ([field, type]) =>
                  `${field}: ${this._displayInlineType(type, cache)}`,
              )
              .join('; ')} }`
          : '{}'
    } else if (type.type === 'module') {
      // TODO: Move displayPath to an option of ErrorDisplayer because it uses
      // it more
      display = `imp ${JSON.stringify(type.path)}`
    } else if (type.type === 'tuple') {
      display = type.types
        .map(type =>
          this._displayInlineType(type, cache, type.type === 'tuple'),
        )
        .join(', ')
    } else if (type.type === 'function') {
      display = `${
        type.typeVarIds.length > 0
          ? `[${type.typeVarIds
              .map(id => cache.getFuncTypeVarNameForId(id))
              .join(', ')}] `
          : ''
      }${this._displayInlineType(
        type.argument,
        cache,
        type.argument.type === 'function' || type.argument.type === 'tuple',
      )} -> ${this._displayInlineType(
        type.return,
        cache,
        type.return.type === 'tuple',
      )}`
    } else if (type.type === 'omitted') {
      display = '...'
    } else {
      throw new TypeError('What is this')
    }
    return inParens ? `(${display})` : display
  }

  private _displayTypeErrorMsg (message: string): string {
    return this.options.type === 'console-color'
      ? colours.white(message)
      : this.options.type === 'html'
      ? `<span class="${this.options.classes?.typeError ??
          'n-error-type-error'}">${escapeHtml(message)}</span>`
      : message
  }

  private _displayTypeError (
    type: ComparisonResult,
    cache = new TypeNameCache(),
    suffix = '',
    inParens?: boolean,
  ): string[] {
    if (
      !type.issue ||
      type.issue.issue === 'should-be' ||
      type.issue.issue === 'too-specific' ||
      type.issue.issue === 'too-general' ||
      type.issue.issue === 'no-overlap'
    ) {
      const typeDisplay = this._displayInlineType(type, cache)
      const lines = [
        inParens ? `(${typeDisplay})${suffix}` : typeDisplay + suffix,
      ]
      if (type.issue) {
        let message =
          (inParens ? ' ' : '') +
          this._displayUnderline(typeDisplay.length) +
          ' '
        if (type.issue.issue === 'should-be') {
          message += this._displayTypeErrorMsg(
            `This should be a ${this._displayInlineTypePretty(
              type.issue.type,
            )}.`,
          )
        } else if (type.issue.issue === 'too-specific') {
          message += this._displayTypeErrorMsg(
            `This function is too specific. It should be able to handle any value, not just str. ${
              this._hint
            }: You can use a type variable for this. Read the documentation for some tips: ${this._displayLink(
              'https://nbuilding.github.io/N-lang-docs/features/generic.html',
            )}`,
          )
        } else if (type.issue.issue === 'too-general') {
          message += this._displayTypeErrorMsg(
            `This should only be a ${this._displayInlineTypePretty(
              type.issue.canOnlyHandle,
            )}.`,
          )
        } else if (type.issue.issue === 'no-overlap') {
          message += this._displayTypeErrorMsg(
            `This has no overlap with ${this._displayInlineTypePretty(
              type.issue.with,
            )}.`,
          )
        }
        lines.push(message)
      }
      return lines
    }
    // Below here assumes that there is an error and it is *inside* the type
    if (type.type === 'named') {
      // If the type does not have type variables then it would not have an
      // error inside the type
      const lines: string[] = []
      for (const typeVar of type.vars) {
        lines.push(
          ...this._displayTypeError(
            typeVar,
            cache,
            ',',
            typeVar.type === 'tuple',
          ),
        )
      }
      return [
        `${type.name}[`,
        ...lines.map(line => this._indent + line),
        ']' + suffix,
      ]
    } else if (type.type === 'record') {
      const extraFields =
        type.issue?.issue === 'record-key-mismatch' ? type.issue.extra : []
      const lines: string[] = []
      let omitted = 0
      for (const [field, innerType] of Object.entries(type.types)) {
        if (innerType.issue) {
          const innerLines = this._displayTypeError(innerType, cache)
          if (innerLines.length <= 2) {
            // Probably the error was something like
            // field: list[int]
            //        ^^^^^^^^^ This should be something else.
            lines.push(`${field}: ${innerLines[0]}`)
            if (innerLines.length === 2) {
              lines.push(' '.repeat(field.length + 2) + innerLines[1])
            }
          } else {
            lines.push(`${field}: ${innerLines[0]}`, ...innerLines.slice(1))
          }
        } else if (extraFields.includes(field)) {
          lines.push(
            `${field}: ${this._displayInlineType(innerType, cache)}`,
            `${this._displayUnderline(
              field.length,
            )} ${this._displayTypeErrorMsg("This field isn't needed.")}`,
          )
        } else {
          omitted++
        }
      }
      if (omitted > 0) {
        lines.push(`... (${omitted} more field${omitted === 1 ? '' : 's'})`)
      }
      if (
        type.issue?.issue === 'record-key-mismatch' &&
        type.issue.missing.length > 0
      ) {
        lines.push(
          (omitted > 0 ? this._displayUnderline(3) + ' ' : '') +
            this._displayTypeErrorMsg(
              `The record is missing the fields ${this._displayList(
                'and',
                type.issue.missing.map(field => this._displayInlineCode(field)),
              )}.`,
            ),
        )
      }
      return ['{', ...lines.map(line => this._indent + line), '}' + suffix]
    } else if (type.type === 'tuple') {
      const lines: string[] = []
      const lastIssueIndex = findLastIndex(type.types, ({ issue }) => !!issue)
      for (const innerType of type.types.slice(0, lastIssueIndex + 1)) {
        lines.push(
          ...this._displayTypeError(
            innerType,
            cache,
            ',',
            innerType.type === 'tuple',
          ),
        )
      }
      const omitted = type.types.length - 1 - lastIssueIndex
      if (omitted > 0) {
        lines.push(`... (${omitted} more field${omitted === 1 ? '' : 's'})`)
      }
      if (type.issue.issue === 'too-many-items') {
        lines.push(
          (omitted > 0 ? this._displayUnderline(3) + ' ' : '') +
            this._displayTypeErrorMsg(
              `This tuple has ${
                type.issue.extra === 1
                  ? 'an extra field'
                  : `${type.issue.extra} too many fields`
              }.`,
            ),
        )
      } else if (type.issue.issue === 'need-extra-items') {
        lines.push(
          (omitted > 0 ? this._displayUnderline(3) + ' ' : '') +
            this._displayTypeErrorMsg(
              `This tuple needs ${type.issue.types.length} more field${
                type.issue.types.length === 1 ? '' : 's'
              }: ${this._displayList(
                'and',
                type.issue.types.map(field =>
                  this._displayInlineTypePretty(field),
                ),
              )}.`,
            ),
        )
      }
      return ['(', ...lines.map(line => this._indent + line), ')' + suffix]
    } else if (type.type === 'function') {
      const funcTypeVars =
        type.typeVarIds.length > 0
          ? `[${type.typeVarIds
              .map(id => cache.getFuncTypeVarNameForId(id))
              .join(', ')}] `
          : ''
      const lines: string[] = []
      // const argLines = this._displayTypeError(type.argument, cache, '', type.argument.type === 'tuple' || type.argument.type === 'function')
      // const returnLines = this._displayTypeError(type.return, cache, '', type.argument.type === 'tuple')
      if (type.argument.issue) {
        if (type.argument.type === 'function') {
          lines.push(funcTypeVars + '(')
          lines.push()
        } else {
          lines.push()
        }
      }
      // TODO
      return []
    } else {
      throw new Error(
        `The type ${type.type} should not have a non-should-be non-func-type-whatever error`,
      )
    }
  }

  private _displayBlock (
    fileName: string,
    lines: string[],
    block: BlockDisplay,
  ): string {
    if (typeof block === 'string') {
      return block
    } else if (block instanceof Base) {
      return this._displayCode(fileName, lines, block)
    } else {
      const displayed = this._displayTypeError(block)
        .map(line => this._indent + line)
        .join('\n')
      return this.options.type === 'console-color'
        ? colours.yellow(displayed)
        : this.options.type === 'html'
        ? `<span class="${this.options.classes?.types ??
            'n-error-types'}">${escapeHtml(displayed)}</span>`
        : displayed
    }
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
      str += this._displayBlock(fileName, lines, block)
      firstLine = false
    }
    return str
  }

  displayWarning (fileName: string, lines: string[], warning: Warning): string {
    const rawBlocks = displayWarningMessage(warning, this._displayLine)
    const blocks: BlockDisplay[] = Array.isArray(rawBlocks)
      ? rawBlocks.filter((block): block is BlockDisplay => !!block)
      : [rawBlocks, warning.base]
    let str =
      this.options.type === 'console-color'
        ? colours.bold(colours.yellow('Warning'))
        : this.options.type === 'html'
        ? `<span class="${this.options.classes?.warning ??
            'n-error-warning'}">Warning</span>`
        : 'Warning'
    str += ': '
    let firstLine = true
    for (const block of blocks) {
      if (!firstLine) {
        str += '\n\n'
      }
      str += this._displayBlock(fileName, lines, block)
      firstLine = false
    }
    return str
  }
}
