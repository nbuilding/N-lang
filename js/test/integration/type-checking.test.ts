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
        const file = await fs.readFile(path, 'utf8')
        const script = parse(file)
        const checker = new TypeChecker({
          resolvePath (basePath: string, importPath: string): string {
            return basePath + importPath // TEMP
          },
          async provideFile (_path: string): Promise<Block> {
            throw new Error('not implemented')
          },
        })
        const result = await checker.start(script)
        if (result.errors.length > 0) {
          const displayer = new ErrorDisplayer({ type: 'console-color' })
          const lines = file.split(/\r?\n/)
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
