// See README.md on how to run this

import fs from 'fs/promises'
import util from 'util'
import { compileToJS } from './compiler/to-js'
import { parse } from './grammar/parse'

async function main () {
  const [, , fileName] = process.argv

  if (!fileName) {
    throw new Error('You need to give a file to parse.')
  }

  const file = await fs.readFile(fileName, 'utf8')
  const script = parse(file)
  console.log(util.inspect(script, false, null, true))
  console.log(script.toString())
  console.log(compileToJS(script))
}

main()
