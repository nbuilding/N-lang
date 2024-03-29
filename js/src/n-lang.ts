// See README.md on how to run this

import * as fs from 'fs/promises'
import * as path from 'path'
import * as util from 'util'
import parseArgs from 'minimist'
// import { compileToJS, TypeChecker, FileLines } from './index'
import { parse } from './grammar/parse'
import {
  CompiledExports,
  NOT_FOUND,
  TypeChecker,
} from './type-checker/TypeChecker'
import { Block } from './ast/statements/Block'
import { ErrorDisplayer } from './type-checker/errors/ErrorDisplayer'
// import { Block } from './ast/index'
// import { TypeChecker } from './type-checker/TypeChecker'
// import { displayError } from './type-checker/errors/Error'

async function main() {
  const {
    _: [fileName],
    help,
    ast,
    repr,
    js,
    run,
    'check-only': checksOnly,
    'ambiguity-output': ambiguityOutput,
  } = parseArgs(process.argv.slice(2), {
    boolean: ['help', 'ast', 'repr', 'js', 'run', 'check-only'],
    string: ['ambiguity-output'],
    alias: {
      h: 'help',
      ao: 'ambiguity-output',
    },
  })

  if (help) {
    console.log('ts-node src/n-lang.ts [...OPTIONS] [FILE]')
    console.log(
      'Parses, compiles, and executes the specified N file with the JS compiler.',
    )
    console.log('')
    console.log('OPTIONS:')
    console.log('\t--help (-h)\tShows this help text and exits.')
    console.log('\t--ast\tOutputs the AST.')
    console.log(
      '\t--repr\tOutputs the textual, N-like representation of the AST.',
    )
    console.log(
      '\t--ambiguity-output=[omit|object|string] (--ao=)\tWhether to omit, show the AST objects, or the string representations of ambiguious parsings. Omits by default.',
    )
    console.log(
      '\t--check-only\tOnly performs type checks without compiling to JS.',
    )
    console.log('\t--js\tOutputs the compiled JS.')
    console.log(
      '\t--run\tExecutes the compiled JS. This is enabled by default if none of the other flags are given.',
    )
    return
  }

  if (!fileName) {
    throw new Error('You need to give a file to parse.')
  }

  const running = run || !(ast || repr || js || checksOnly)

  const checker = new TypeChecker({
    absolutePath(basePath: string, importPath: string): string {
      return path.resolve(path.dirname(basePath), importPath)
    },
    async provideFile(path: string) {
      try {
        const file = await fs.readFile(path, 'utf8')
        const block = parse(file, {
          ambiguityOutput,
          loud: true,
        })
        if (block instanceof Block) {
          if (ast) console.log(util.inspect(block, false, null, true))
          if (repr) console.log(block.toString())
          return { source: file, block }
        } else {
          return { source: file, error: block }
        }
      } catch (err) {
        if (err instanceof Error) {
          const nodeError: NodeJS.ErrnoException = err
          if (nodeError.code === 'ENOENT') {
            return NOT_FOUND
          }
        }
        throw err
      }
    },
  })
  const result = await checker.start(path.resolve(fileName))
  if (!(js || running || checksOnly)) return
  const displayer = new ErrorDisplayer({
    type: 'console-color',
    displayPath(absolutePath: string, basePath: string) {
      return path.relative(path.dirname(basePath), absolutePath)
    },
  })
  const { display, errors } = result.displayAll(displayer)
  console.log(display)
  if (errors > 0) return

  const compiled = checker.compile(result, { module: { type: 'iife' } })
  if (js) {
    await fs.writeFile(fileName.replace(/\.n$/, '.js'), compiled)
  }
  // Indirect call of eval to run in global scope
  if (running) {
    try {
      const { valueAssertions, main }: CompiledExports = new Function("require", `return ${compiled}`)(require)
      new Function("require", "main", `main().then(_ => {});`)(require, main)
      //await main()
      const { display } = result.displayValueAssertions(
        displayer,
        valueAssertions,
      )
      console.log(display)
    } catch (e: any) {
      console.log("INTERNAL ERROR: ")
      console.log(e)
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
