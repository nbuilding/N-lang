// See README.md on how to run this

import fs from 'fs/promises'
import util from 'util'
import { parse } from './grammar/parse'

async function main () {
  const [, , fileName] = process.argv

  if (!fileName) {
    throw new Error('You need to give a file to parse.')
  }

  console.log(util.inspect(parse(await fs.readFile(fileName, 'utf8')), false, null, true))
}

main()
