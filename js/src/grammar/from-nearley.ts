import moo from 'moo'
import util from 'util'

import { isToken, shouldSatisfy } from '../utils/type-guards'
import schema, * as schem from '../utils/schema'
import { Base, BasePosition } from './ast/base'

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
    try {
      hasSchema.schema.check(args)
      return hasSchema.fromSchema({ line, col, endLine, endCol }, args)
    } catch (err) {
      if (err instanceof schem.GuardError) {
        console.log('args', util.inspect(args, false, null, true))
        console.log('hasSchema', util.inspect(hasSchema, false, null, true))
        console.log('err.value', util.inspect(err.value, false, null, true))
      }
      throw err
    }
  }
  return preprocessor
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
