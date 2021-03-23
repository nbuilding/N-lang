import { Block } from '../ast/index'
import { Error as NError } from './errors/Error'
import { Warning as NWarning } from './errors/Warning'
import { FileGetter } from './FileGetter'
import { Scope } from './Scope'

export class TypeCheckerResult {
  checker: TypeChecker
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

  async start (file: Block, filePath = 'run.n') {
    const getter = new FileGetter(this)
    await getter.start(file, filePath)
    this._checkFile(file)
  }

  private _checkFile (file: Block) {
    const result = new TypeCheckerResult(this)
    const scope = new Scope(result)
    scope.checkStatement(file)
    console.log(result.errors)
  }
}
