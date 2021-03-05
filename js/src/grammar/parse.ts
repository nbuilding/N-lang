import util from 'util'
import { Parser, Grammar } from 'nearley'
import grammar from './n-lang.grammar'
import { Block } from './ast'
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
}

export function parse (script: string, { ambiguityOutput = 'omit' }: ParseOptions = {}): Block {
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
    console.error(results)
    let i = 1
    try {
      for (; i < parser.results.length; i++) {
        assert.deepStrictEqual(parser.results[0], parser.results[i])
      }
      console.error('All the results are exactly the same! D:')
    } catch (err) {
      console.error(err.message)
      console.error(`^ Differences between results 0 and ${i}`)
    }
    throw new ParseError(parser.results, `You've discovered an ambiguity in the grammar (${parser.results.length} possibilities). This is a bug with the N parser.`)
  }
  return result
}
