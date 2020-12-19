// See README.md on how to run this

const fs = require('fs/promises')
const { Parser, Grammar } = require('nearley')
const grammar = require('./n-lang-grammar.js')

async function main () {
  const parser = new Parser(Grammar.fromCompiled(grammar))
  parser.feed(await fs.readFile('./run.n', 'utf8'))

  if (parser.results.length > 1) {
    console.log(parser.results)
    throw new Error('Ambiguous grammar. (See above.)')
  }

  const [result] = parser.results
  if (!result) {
    throw new Error('Unexpected end of input.')
  }

  console.log(result)
}

main()
