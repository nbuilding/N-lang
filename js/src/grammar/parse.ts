import util from 'util'
import { Parser, Grammar } from 'nearley'
import grammar from './n-lang.grammar'
import { Block } from './ast'
import assert from 'assert'

interface ParseOptions {
  ambiguityOutput?: 'omit' | 'object' | 'string'
}

export function parse (script: string, { ambiguityOutput = 'omit' }: ParseOptions = {}): Block {
  const parser = new Parser(Grammar.fromCompiled(grammar))
  parser.feed(script)
  const [result, ...ambiguities] = parser.results
  if (!result) {
    throw new SyntaxError('Unexpected end of input.')
  }
  if (ambiguities.length) {
    try {
      assert.deepStrictEqual(ambiguities[0], ambiguities[1])
      console.warn('The first two results are exactly the same! D:')
    } catch (err) {
      console.log('Differences between the first two results:', err.message)
    }
    let results: string
    switch (ambiguityOutput) {
      case 'omit': {
        results = '[results omitted]'
        break
      }
      case 'object': {
        results = util.inspect(parser.results, false, null, true)
        break
      }
      case 'string': {
        results = parser.results.map(a => a.toString()).join('\n\n')
        break
      }
    }
    throw new SyntaxError(`You've discovered an ambiguity in the grammar! ${results} (${parser.results.length} items)`)
  }
  return result
}
