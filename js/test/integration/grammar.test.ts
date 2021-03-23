import * as fs from 'fs/promises'
import { resolve, join } from 'path'

import { FileLines } from '../../src/type-checker/display-lines'
import { DiffError } from '../../src/grammar/ast/base'

const syntaxTestsDir = resolve(__dirname, '../../../tests/syntax/')
const files: { path: string; name: string }[] = []

before(async () => {
  for (const name of await fs.readdir(syntaxTestsDir)) {
    const path = join(syntaxTestsDir, name)
    const stat = await fs.stat(path)
    if (stat.isFile() && name.endsWith('.n')) {
      files.push({ path, name })
    }
  }
  describe('grammar', () => {
    for (const { name, path } of files) {
      it(name, async function () {
        const file = await fs.readFile(path, 'utf8')
        const [firstSnippet, ...snippets] = file
          .split(/(?:\r?\n){3}/)
          .map(snippet => new FileLines(snippet, name).parse())

        for (let i = 0; i < snippets.length; i++) {
          const differences = firstSnippet.diff(snippets[i])
          if (differences.length > 0) {
            throw new DiffError(differences)
          }
        }
      })
    }
  })
})

it('the syntax tests directory should exist', async () => {
  await fs.access(syntaxTestsDir)
})
