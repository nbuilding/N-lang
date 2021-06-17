import { Base, Block, ImportFile } from '../ast/index'
import { parse } from '../grammar/parse'
import { Error as NError } from './errors/Error'
import { ErrorDisplayer } from './errors/ErrorDisplayer'
import { Warning as NWarning } from './errors/Warning'
import { GlobalScope } from './GlobalScope'
import { NModule, NType, unknown, Unknown } from './types/types'

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
  | { state: 'loaded'; module: NModule | Unknown }
  | { state: 'error'; error: unknown }

export class TypeCheckerResults {
  checker: TypeChecker
  startPath: string
  types: Map<Base, NType> = new Map()
  files: Map<string, TypeCheckerResultsForFile> = new Map()

  constructor (checker: TypeChecker, startPath: string) {
    this.checker = checker
    this.startPath = startPath
  }

  newFile (
    absolutePath: string,
    source: string,
    modules: Map<string, ModuleState> = new Map(),
  ): TypeCheckerResultsForFile {
    const file = new TypeCheckerResultsForFile(
      this,
      absolutePath,
      source.split(/\r?\n/),
      modules,
    )
    this.files.set(absolutePath, file)
    return file
  }

  /**
   * Joins all the errors and warnings together into a single string, separated by double newlines.
   */
  displayAll (
    displayer: ErrorDisplayer,
  ): { display: string; errors: number; warnings: number } {
    const allWarnings = []
    const allErrors = []
    for (const file of this.files.values()) {
      const { warnings, errors } = file.display(displayer)
      allWarnings.push(...warnings)
      allErrors.push(...errors)
    }
    return {
      display: [...allWarnings, ...allErrors].join('\n\n'),
      errors: allErrors.length,
      warnings: allWarnings.length,
    }
  }
}

export class TypeCheckerResultsForFile {
  parent: TypeCheckerResults
  absolutePath: string
  lines: string[]
  modules: Map<string, ModuleState>
  errors: NError[] = []
  warnings: NWarning[] = []

  constructor (
    parent: TypeCheckerResults,
    absolutePath: string,
    lines: string[],
    modules: Map<string, ModuleState>,
  ) {
    this.parent = parent
    this.absolutePath = absolutePath
    this.lines = lines
    this.modules = modules
  }

  display (
    displayer: ErrorDisplayer,
  ): { errors: string[]; warnings: string[] } {
    const { displayPath } = this.parent.checker.options
    const path = displayPath
      ? displayPath(this.absolutePath, this.parent.startPath)
      : this.absolutePath
    return {
      errors: this.errors.map(error =>
        displayer.displayError(path, this.lines, error),
      ),
      warnings: this.warnings.map(warning =>
        displayer.displayWarning(path, this.lines, warning),
      ),
    }
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
  provideFile(
    path: string,
  ):
    | string
    | [string, Block]
    | NModule
    | PromiseLike<string | [string, Block] | NModule>

  /**
   * Display absolute paths in a less verbose manners, if needed, for displaying
   * errors. For example, this can return a relative path based on the starting
   * script. If omitted, the absolute path will be displayed instead.
   *
   * @param basePath - The `startPath` given through `.start`
   */
  displayPath?(absolutePath: string, basePath: string): string
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
    const results = new TypeCheckerResults(this, startPath)
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
      let module = await this.options.provideFile(modulePath)
      if (typeof module === 'string') {
        let parsed
        try {
          parsed = parse(module)
        } catch (error) {
          const errors = results.newFile(modulePath, module)
          // TODO: Add syntax error
          this.moduleCache.set(modulePath, { state: 'loaded', module: unknown })
          return
        }
        module = [module, parsed]
      }
      if (Array.isArray(module)) {
        const [source, parsed] = module
        const relToAbsPaths: Map<string, string> = new Map()
        for (const importPath of getImportPaths(parsed)) {
          const path = this.options.absolutePath(modulePath, importPath)
          relToAbsPaths.set(importPath, path)
        }
        await Promise.all(
          Array.from(relToAbsPaths.values(), path =>
            this._ensureModuleLoaded(results, path),
          ),
        )
        const globalScope = new GlobalScope(
          results.newFile(
            modulePath,
            source,
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
        scope.checkStatement(parsed)
        scope.end()
        module = scope.toModule(modulePath)
      }
      this.moduleCache.set(modulePath, { state: 'loaded', module })
    } catch (error) {
      this.moduleCache.set(modulePath, { state: 'error', error })
    }
  }
}
