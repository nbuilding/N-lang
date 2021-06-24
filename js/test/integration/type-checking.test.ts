import * as fs from 'fs/promises'
import { resolve, join } from 'path'

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
          async provideFile (path: string): Promise<string> {
            return await fs.readFile(path, 'utf8')
          },
        })
        const result = await checker.start(path)
        const { display, errors } = result.displayAll(
          new ErrorDisplayer({ type: 'console-color' }),
        )
        if (errors > 0) {
          throw new TypeError(display)
        }
      })
    }
  })
})

it('the type checking directory should exist', async () => {
  await fs.access(typeCheckTestsDir)
})
