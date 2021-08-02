import { AssertionError } from 'chai'
import * as fs from 'fs/promises'
import { resolve, join, dirname } from 'path'

import { ErrorDisplayer } from '../../src/type-checker/errors/ErrorDisplayer'
import {
  CompiledExports,
  TypeChecker,
} from '../../src/type-checker/TypeChecker'

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
  describe('type and value assertions', () => {
    for (const { name, path } of files) {
      it(name, async function () {
        const checker = new TypeChecker({
          absolutePath (basePath: string, importPath: string): string {
            return resolve(dirname(basePath), importPath)
          },
          async provideFile (path: string): Promise<string> {
            return await fs.readFile(path, 'utf8')
          },
        })
        const result = await checker.start(path)
        const displayer = new ErrorDisplayer({ type: 'console-color' })
        const { display, errors } = result.displayAll(displayer)
        if (errors > 0) {
          throw new TypeError(display)
        }
        const compiled = checker.compile(result, { module: { type: 'iife' } })
        const module: CompiledExports = (1, eval)(compiled)
        await module.main()
        const {
          display: assertDisplay,
          failures,
        } = result.displayValueAssertions(displayer, module.valueAssertions)
        if (failures > 0) {
          throw new AssertionError(assertDisplay)
        }
      })
    }
  })
})

it('the type checking directory should exist', async () => {
  await fs.access(typeCheckTestsDir)
})
