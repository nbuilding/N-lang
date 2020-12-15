// See n-lang.ne on how to run this

const fs = require('fs/promises')
const { Parser, Grammar } = require('nearley')
const grammar = require('./dist/n-lang.js')

async function main () {
  const parser = new Parser(Grammar.fromCompiled(grammar))
  parser.feed(await fs.readFile('./run.n', 'utf8'))
  console.log(parser.results)

  const assert = require('assert')
  for (const a of parser.results.slice(1)) {
    assert.deepStrictEqual(parser.results[0], a)
  }
}

main()
