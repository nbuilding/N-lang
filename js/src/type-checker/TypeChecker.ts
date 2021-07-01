import { Base, BasePosition, Block, ImportFile } from '../ast/index'
import {
  parse,
  ParseAmbiguityError,
  ParseError,
  ParseUnexpectedInputError,
  ParseUnexpectedEOFError,
} from '../grammar/parse'
import { Error as NError } from './errors/Error'
import { ErrorDisplayer, FilePathSpec } from './errors/ErrorDisplayer'
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
  | { state: 'error'; error: typeof NOT_FOUND | typeof BAD_PATH }

export class TypeCheckerResults {
  checker: TypeChecker
  startPath: string
  types: Map<Base, NType> = new Map()
  files: Map<string, BaseResultsForFile> = new Map()

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

  syntaxError (
    absolutePath: string,
    source: string,
    error: ParseError,
  ): SyntaxErrorForFile {
    const result = new SyntaxErrorForFile(
      this,
      absolutePath,
      source.split(/\r?\n/),
      error,
    )
    this.files.set(absolutePath, result)
    return result
  }

  /**
   * Joins all the errors and warnings together into a single string, separated
   * by double newlines.
   */
  displayAll (
    displayer: ErrorDisplayer,
  ): { display: string; errors: number; warnings: number } {
    const allWarnings = []
    const allErrors = []
    for (const file of this.files.values()) {
      const { errors, warnings = [] } = file.display(displayer)
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

export abstract class BaseResultsForFile {
  parent: TypeCheckerResults
  absolutePath: string
  lines: string[]
  modules: Map<string, ModuleState>

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

  get path (): FilePathSpec {
    return {
      file: this.absolutePath,
      base: this.parent.startPath,
    }
  }

  display (
    _displayer: ErrorDisplayer,
  ): { errors: string[]; warnings?: string[] } {
    throw new Error('Not implemented')
  }
}

export class TypeCheckerResultsForFile extends BaseResultsForFile {
  errors: NError[] = []
  warnings: NWarning[] = []

  display (
    displayer: ErrorDisplayer,
  ): { errors: string[]; warnings: string[] } {
    return {
      errors: this.errors.map(error =>
        displayer.displayError(this.path, this.lines, error),
      ),
      warnings: this.warnings.map(warning =>
        displayer.displayWarning(this.path, this.lines, warning),
      ),
    }
  }
}

export class SyntaxErrorForFile extends BaseResultsForFile {
  error: ParseError

  constructor (
    parent: TypeCheckerResults,
    absolutePath: string,
    lines: string[],
    error: ParseError,
  ) {
    super(parent, absolutePath, lines, new Map())
    this.error = error
  }

  get position (): BasePosition {
    if (
      this.error instanceof ParseUnexpectedEOFError ||
      this.error instanceof ParseAmbiguityError
    ) {
      const lastLine = this.lines[this.lines.length - 1]
      if (lastLine.length === 0) {
        const penultimateLine = this.lines[this.lines.length - 2]
        return {
          line: this.lines.length - 1,
          col: penultimateLine.length,
          endLine: this.lines.length - 1,
          endCol: penultimateLine.length + 1,
        }
      } else {
        return {
          line: this.lines.length,
          col: lastLine.length,
          endLine: this.lines.length,
          endCol: lastLine.length + 1,
        }
      }
    } else if (this.error instanceof ParseUnexpectedInputError) {
      return {
        line: this.error.line,
        col: this.error.col,
        endLine: this.error.line,
        endCol: this.error.col + 1,
      }
    } else {
      const { line, col } = this.error.end
      return {
        line: this.error.line,
        col: this.error.col,
        endLine: line,
        endCol: col,
      }
    }
  }

  display (displayer: ErrorDisplayer): { errors: string[] } {
    return {
      errors: [
        displayer.displaySyntaxError(
          this.path,
          this.lines,
          this.error,
          this.position,
        ),
      ],
    }
  }
}

export const NOT_FOUND = Symbol('not found')
export const BAD_PATH = Symbol('bad path')

type ParsedBlockWithSource = { source: string; block: Block }
type ParseErrorWithSource = { source: string; error: ParseError }
export type ProvidedFile =
  | string
  | ParsedBlockWithSource
  | NModule
  | ParseErrorWithSource
  | typeof NOT_FOUND
  | typeof BAD_PATH

export interface CheckerOptions {
  /**
   * Resolve a unique path name per file given a base path. If two files import
   * the same file, the path to that file should be the same.
   */
  absolutePath(basePath: string, importPath: string): string

  /**
   * Asynchronously gets an imported file and returns the parsed file.
   */
  provideFile(path: string): ProvidedFile | PromiseLike<ProvidedFile>
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

  private async _getResultFromProvided (
    results: TypeCheckerResults,
    modulePath: string,
    provided: ProvidedFile,
  ): Promise<NModule | ParseErrorWithSource | null> {
    if (typeof provided === 'symbol') {
      this.moduleCache.set(modulePath, { state: 'error', error: provided })
      return null
    } else if (typeof provided === 'string' || 'block' in provided) {
      let blockWithSource: ParsedBlockWithSource
      if (typeof provided === 'string') {
        const parsed = parse(provided)
        if (parsed instanceof Block) {
          blockWithSource = { source: provided, block: parsed }
        } else {
          return { source: provided, error: parsed }
        }
      } else {
        blockWithSource = provided
      }
      const { source, block } = blockWithSource

      const relToAbsPaths: Map<string, string> = new Map()
      for (const importPath of getImportPaths(block)) {
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
      scope.checkStatement(block)
      scope.end()
      return scope.toModule(modulePath)
    } else {
      return provided
    }
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

    const result = await this._getResultFromProvided(
      results,
      modulePath,
      await this.options.provideFile(modulePath),
    )
    if (result) {
      if ('error' in result) {
        results.syntaxError(modulePath, result.source, result.error)
        this.moduleCache.set(modulePath, { state: 'loaded', module: unknown })
      } else {
        this.moduleCache.set(modulePath, { state: 'loaded', module: result })
      }
    }
  }
}