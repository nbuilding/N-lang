import moo from 'moo'
import { isToken, shouldSatisfy } from '../utils/type-guards'
import schema, * as schem from '../utils/schema'
import { isType, Type } from './ast/types'
import { Identifier } from './ast/literals'

type NearleyArgs = (Base | moo.Token | NearleyArgs | null)[]
function shouldBeNearleyArgs (value: any): asserts value is NearleyArgs {
  shouldSatisfy(Array.isArray, value)
  for (const val of value) {
    if (!(val === null || val instanceof Base || isToken(val))) {
      shouldBeNearleyArgs(val)
    }
  }
}

interface HasSchema<T extends Base, S> {
  schema: schem.Guard<S>
  fromSchema (pos: BasePosition, args: S): T
}

function getNonNullArgs (args: NearleyArgs): (Base | moo.Token)[] {
  const nonNullArgs: (Base | moo.Token)[] = []
  for (const arg of args) {
    // Assert that the type annotations are correct because Nearley kind of
    // fuzzles with TypeScript, and one can't be sure.
    if (arg) {
      if (Array.isArray(arg)) {
        nonNullArgs.push(...getNonNullArgs(arg))
      } else {
        nonNullArgs.push(arg)
      }
    }
  }
  return nonNullArgs
}

export function from<T extends Base, S> (hasSchema: HasSchema<T, S>) {
  function preprocessor (args: any[], _loc?: number, _reject?: {}): T {
    shouldBeNearleyArgs(args)
    const nonNullArgs = getNonNullArgs(args)
    if (nonNullArgs.length === 0) {
      throw new SyntaxError('I cannot create a Base out of nothing! (Array was empty or full of nulls.)')
    }
    const { line, col } = nonNullArgs[0]
    const lastTokenOrBase = nonNullArgs[nonNullArgs.length - 1]
    let endLine, endCol
    if (lastTokenOrBase instanceof Base) {
      endLine = lastTokenOrBase.endLine
      endCol = lastTokenOrBase.endCol
    } else {
      endLine = lastTokenOrBase.line + lastTokenOrBase.lineBreaks
      const lastLine = lastTokenOrBase.text.includes('\n')
        ? lastTokenOrBase.text.slice(lastTokenOrBase.text.lastIndexOf('\n') + 1)
        : lastTokenOrBase.text
      endCol = lastTokenOrBase.col + lastLine.length
    }
    hasSchema.schema.check(args)
    return hasSchema.fromSchema({ line, col, endLine, endCol }, args)
  }
  return preprocessor
}

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

const includeBracketsSchema = schema.tuple([
  schema.any,
  schema.any,
  schema.instance(Base),
  schema.any,
  schema.any,
])
export const includeBrackets = from({
  schema: includeBracketsSchema,
  fromSchema ({ line, col, endLine, endCol }: BasePosition, [, , base]: schem.infer<typeof includeBracketsSchema>): Base {
    base.line = line
    base.col = col
    base.endLine = endLine
    base.endCol = endCol
    return base
  },
})

export class Declaration extends Base {
  name: Identifier | null
  type: Type | null

  constructor (pos: BasePosition, name: Identifier | null, type: Type | null) {
    super(pos, type ? [type] : [])
    this.name = name
    this.type = type
  }

  toString () {
    return this.type ? `${this.name}: ${this.type}` : this.name
  }

  static schema = schema.tuple([
    schema.instance(Identifier), // TODO: _
    schema.tuple([
      schema.any,
      schema.guard(isType),
    ]),
  ])

  static fromSchema (pos: BasePosition, [id, [, type]]: schem.infer<typeof Declaration.schema>): Declaration {
    return new Declaration(pos, id, type)
  }
}
