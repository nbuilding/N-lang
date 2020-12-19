import util from 'util'
import { Parser, Grammar } from 'nearley'
import grammar from './n-lang.grammar'
import { Block } from './ast'

export function parse (script: string): Block {
  const parser = new Parser(Grammar.fromCompiled(grammar))
  parser.feed(script)
  const [result, ...ambiguities] = parser.results
  if (!result) {
    throw new SyntaxError('Unexpected end of input.')
  }
  if (ambiguities.length) {
    throw new SyntaxError(`You've discovered an ambiguity in the grammar! ${
      util.inspect(parser.results, false, null, true)
    }`)
  }
  return result
}
