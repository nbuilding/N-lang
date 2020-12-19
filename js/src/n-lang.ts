// See README.md on how to run this

import fs from 'fs/promises'
import util from 'util'
import { Parser, Grammar } from 'nearley'
import grammar from './grammar/n-lang.grammar'

async function main () {
  const [, , fileName] = process.argv

  if (!fileName) {
    throw new Error('You need to give a file to parse.')
  }

  const parser = new Parser(Grammar.fromCompiled(grammar))
  parser.feed(await fs.readFile(fileName, 'utf8'))

  if (parser.results.length > 1) {
    console.log(parser.results)
    throw new Error('Ambiguous grammar. (See above.)')
  }

  const [result] = parser.results
  if (!result) {
    throw new Error('Unexpected end of input.')
  }

  console.log(util.inspect(result, false, null, true))
}

main()
