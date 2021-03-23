import util from 'util'
import { Parser, Grammar } from 'nearley'
import grammar from './n-lang.grammar'
import { Block, Base, DiffError } from '../ast/index'
import assert from 'assert'

export class ParseError extends SyntaxError {
  results: any[]

  constructor (results: any[], message: string) {
    super(message)
    this.name = this.constructor.name
    this.results = results
  }
}

export interface ParseOptions {
  ambiguityOutput?: 'omit' | 'object' | 'string'
  loud?: boolean
}

export function parse (
  script: string,
  { ambiguityOutput = 'omit', loud = false }: ParseOptions = {},
): Block {
  const parser = new Parser(Grammar.fromCompiled(grammar))
  parser.feed(script)
  const [result, ...ambiguities] = parser.results
  if (!result) {
    throw new ParseError(parser.results, 'Unexpected end of input.')
  }
  if (ambiguities.length) {
    let results: string
    switch (ambiguityOutput) {
      case 'omit': {
        results = '[results omitted]'
        break
      }
      case 'object': {
        results = util.inspect(parser.results, {
          depth: null,
          colors: true,
        })
        break
      }
      case 'string': {
        results = parser.results.map(a => a.toString(true)).join('\n\n')
        break
      }
    }
    if (loud) {
      console.error(results)
      let i = parser.results.length - 1
      try {
        for (; i >= 1; i--) {
          const one = parser.results[0]
          const other = parser.results[i]
          if (one instanceof Base && other instanceof Base) {
            const differences = one.diff(other)
            if (differences.length > 0) {
              throw new DiffError(differences)
            }
          } else {
            assert.deepStrictEqual(one, other)
          }
        }
        console.error('All the results are exactly the same! D:')
      } catch (err) {
        console.error(err.message)
        console.error(`^ Differences between results 0 and ${i}`)
      }
    }
    throw new ParseError(
      parser.results,
      `You've discovered an ambiguity in the grammar (${parser.results.length} possibilities). This is a bug with the N parser.`,
    )
  }
  return result
}
