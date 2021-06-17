import * as fs from 'fs/promises'
import { resolve, join } from 'path'

import { Block } from '../../src/ast/statements/Block'
import { parse } from '../../src/grammar/parse'
import { ErrorDisplayer } from '../../src/type-checker/errors/ErrorDisplayer'
import { TypeChecker } from '../../src/type-checker/TypeChecker'

const typeCheckTestsDir = resolve(__dirname, '../../../tests/assertions/')
const files: { path: string; name: string }[] = []

before(async () => {
  for (const name of await fs.readdir(typeCheckTestsDir)) {
    const path = join(typeCheckTestsDir, name)
    const stat = await fs.stat(path)
    if (stat.isFile() && name.endsWith('.n')) {
      files.push({ path, name })
    }
  }
  describe('type checking', () => {
    for (const { name, path } of files) {
      it(name, async function () {
        const checker = new TypeChecker({
          absolutePath (basePath: string, importPath: string): string {
            return resolve(basePath, importPath)
          },
          async provideFile (path: string): Promise<Block> {
            const file = await fs.readFile(path, 'utf8')
            return parse(file)
          },
        })
        const result = await checker.start(path)
        if (result.errors.length > 0) {
          const displayer = new ErrorDisplayer({ type: 'console-color' })
          const lines: string[] = [] // TEMP
          throw new TypeError(
            result.errors
              .map(error => displayer.displayError('run.n', lines, error))
              .join('\n\n'),
          )
        }
      })
    }
  })
})

it('the type checking directory should exist', async () => {
  await fs.access(typeCheckTestsDir)
})
