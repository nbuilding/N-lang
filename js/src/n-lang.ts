// See README.md on how to run this

import fs from 'fs/promises'
import util from 'util'
import { compileToJS } from './compiler/to-js'
import { parse } from './grammar/parse'
import parseArgs from 'minimist'

async function main () {
  const { _: [fileName], help, ast, repr, js, run, 'ambiguity-output': ambiguityOutput } = parseArgs(process.argv.slice(2), {
    boolean: ['help', 'ast', 'repr', 'js', 'run'],
    string: ['ambiguity-output'],
    alias: {
      h: 'help',
      ao: 'ambiguity-output'
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
    console.log('\t--ambiguity-output=[omit|object|string] (--ao=)\tWhether to omit, show the AST objects, or the string representations of ambiguious parsings. Omits by default.')
    console.log('\t--js\tOutputs the compiled JS.')
    console.log('\t--run\tExecutes the compiled JS. This is enabled by default if none of the other flags are given.')
    return
  }

  if (!fileName) {
    throw new Error('You need to give a file to parse.')
  }

  const running = run || !(ast || repr || js)

  const file = await fs.readFile(fileName, 'utf8')
  const script = parse(file, {
    ambiguityOutput
  })
  if (ast) console.log(util.inspect(script, false, null, true))
  if (repr) console.log(script.toString(true))
  if (js || running) {
    const compiled = compileToJS(script)
    if (js) console.log(compiled)
    // Indirect call of eval to run in global scope
    if (running) (null, eval)(compiled)
  }
}

main()
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
