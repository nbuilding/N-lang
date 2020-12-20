// See README.md on how to run this

import fs from 'fs/promises'
import util from 'util'
import { compileToJS } from './compiler/to-js'
import { parse } from './grammar/parse'
import parseArgs from 'minimist'

async function main () {
  const { _: [fileName], help, ast, repr, js, run } = parseArgs(process.argv.slice(2), {
    boolean: ['help', 'ast', 'repr', 'js', 'run'],
    alias: {
      h: 'help'
    }
  })

  if (help) {
    console.log('ts-node src/n-lang.ts [...OPTIONS] [FILE]')
    console.log('Parses, compiles, and executes the specified N file with the JS compiler.')
    console.log('')
    console.log('OPTIONS:')
    console.log('\t--help (-h)\tShows this help text and exits.')
    console.log('\t--ast\tOutputs the AST.')
    console.log('\t--repr\tOutputs the textual, N-like representation of the AST.')
    console.log('\t--js\tOutputs the compiled JS.')
    console.log('\t--run\tExecutes the compiled JS. This is enabled by default if none of the other flags are given.')
    return
  }

  if (!fileName) {
    throw new Error('You need to give a file to parse.')
  }

  const file = await fs.readFile(fileName, 'utf8')
  const script = parse(file)
  if (ast) console.log(util.inspect(script, false, null, true))
  if (repr) console.log(script.toString())
  const compiled = compileToJS(script)
  if (js) console.log(compiled)
  // Indirect call of eval to run in global scope
  if (run || !(ast || repr || js)) (null, eval)(compiled)
}

main()
