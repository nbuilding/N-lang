import { Base, Block, ImportFile } from '../ast/index'
import { Error as NError } from './errors/Error'
import { Warning as NWarning } from './errors/Warning'
import { GlobalScope } from './GlobalScope'
import { NModule, NType } from './types/types'

/** Yields relative paths from `imp` expressions */
function * getImportPaths (base: Base): Generator<string> {
  if (base instanceof ImportFile) {
    yield base.getImportPath()
  }
  for (const child of base.children) {
    yield * getImportPaths(child)
  }
}

type ModuleState =
  | { state: 'loading' }
  | { state: 'loaded'; module: NModule }
  | { state: 'error'; error: unknown }

export class TypeCheckerResults {
  checker: TypeChecker
  types: Map<Base, NType> = new Map()
  errors: NError[] = []
  warnings: NWarning[] = []

  constructor (checker: TypeChecker) {
    this.checker = checker
  }
}

export class TypeCheckerResultsForFile {
  parent: TypeCheckerResults
  modules: Map<string, ModuleState>

  constructor (parent: TypeCheckerResults, modules: Map<string, ModuleState>) {
    this.parent = parent
    this.modules = modules
  }
}

export interface CheckerOptions {
  /**
   * Resolve a unique path name per file given a base path. If two files import
   * the same file, the path to that file should be the same.
   */
  absolutePath(basePath: string, importPath: string): string

  /**
   * Asynchronously gets an imported file and returns the parsed file.
   * This may reject with an Error if the file does not exist.
   */
  provideFile(path: string): Block | NModule | PromiseLike<Block | NModule>
}

export class TypeChecker {
  options: CheckerOptions
  moduleCache: Map<string, ModuleState> = new Map()

  constructor (options: CheckerOptions) {
    this.options = options
  }

  /**
   * @param startPath - The absolute path (unique file ID) of the start file.
   */
  async start (startPath: string): Promise<TypeCheckerResults> {
    const results = new TypeCheckerResults(this)
    await this._ensureModuleLoaded(results, startPath)
    return results
  }

  /**
   * @param modulePath - Unique ID for the file (with a file system, the
   * absolute path).
   */
  private async _ensureModuleLoaded (
    results: TypeCheckerResults,
    modulePath: string,
  ) {
    if (this.moduleCache.has(modulePath)) return
    this.moduleCache.set(modulePath, { state: 'loading' })
    try {
      const module = await this.options.provideFile(modulePath)
      if (module instanceof Block) {
        const relToAbsPaths: Map<string, string> = new Map()
        for (const importPath of getImportPaths(module)) {
          const path = this.options.absolutePath(modulePath, importPath)
          relToAbsPaths.set(importPath, path)
        }
        await Promise.all(
          Array.from(relToAbsPaths.values(), path =>
            this._ensureModuleLoaded(results, path),
          ),
        )
        const globalScope = new GlobalScope(
          new TypeCheckerResultsForFile(
            results,
            new Map(
              Array.from(relToAbsPaths, ([path, absPath]) => {
                const state = this.moduleCache.get(absPath)
                if (!state) {
                  throw new Error('module cache does not have absolute path.')
                }
                return [path, state]
              }),
            ),
          ),
        )
        const scope = globalScope.inner({ exportsAllowed: true })
        scope.checkStatement(module)
        scope.end()
      } else {
        this.moduleCache.set(modulePath, { state: 'loaded', module })
      }
    } catch (error) {
      this.moduleCache.set(modulePath, { state: 'error', error })
    }
  }
}
