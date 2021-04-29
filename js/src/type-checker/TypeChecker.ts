import { Base, Block } from '../ast/index'
import { Error as NError } from './errors/Error'
import { Warning as NWarning } from './errors/Warning'
import { FileGetter } from './FileGetter'
import { GlobalScope } from './GlobalScope'
import { NType } from './types/types'

export class TypeCheckerResult {
  checker: TypeChecker
  types: Map<Base, NType> = new Map()
  errors: NError[] = []
  warnings: NWarning[] = []

  constructor (checker: TypeChecker) {
    this.checker = checker
  }
}

export interface CheckerOptions {
  /**
   * Resolve a unique path name per file given a base path. If two files import
   * the same file, the path to that file should be the same.
   */
  resolvePath(basePath: string, importPath: string): string

  /**
   * Asynchronously gets an imported file and returns the parsed file.
   * TODO: In the future, perhaps this could also return only the types.
   */
  provideFile(path: string): Promise<Block>
}

export class TypeChecker {
  options: CheckerOptions

  constructor (options: CheckerOptions) {
    this.options = options
  }

  async start (file: Block, filePath = 'run.n'): Promise<TypeCheckerResult> {
    const getter = new FileGetter(this)
    await getter.start(file, filePath)
    return this._checkFile(file)
  }

  private _checkFile (file: Block): TypeCheckerResult {
    const result = new TypeCheckerResult(this)
    const globalScope = new GlobalScope(result)
    const scope = globalScope.inner()
    scope.checkStatement(file)
    scope.end()
    return result
  }
}
