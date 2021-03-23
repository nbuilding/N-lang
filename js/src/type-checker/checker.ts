import { Base, ImportFile } from '../ast/index'

function getImports (base: Base, target: Set<string> = new Set()): Set<string> {
  if (base instanceof ImportFile) {
    target.add(base.getImportPath())
  }
  for (const child of base.children) {
    getImports(child, target)
  }
  return target
}

interface FileImports {
  /** Parsed file */
  base: Base | Error

  /** Absolute paths to imported files */
  imports: string[]
}

class FileGetter {
  files: Map<string, FileImports> = new Map()
  checker: TypeChecker

  constructor (checker: TypeChecker) {
    this.checker = checker
  }

  async start (
    file: Base,
    filePath: string,
  ): Promise<Map<string, FileImports>> {
    await this._scanFile(filePath, { base: file, imports: [] })
    return this.files
  }

  private async _scanFile (filePath: string, file: FileImports): Promise<void> {
    this.files.set(filePath, file)
    if (file.base instanceof Error) return
    const promises = []
    for (const importPath of getImports(file.base)) {
      const path = this.checker.options.resolvePath(filePath, importPath)
      file.imports.push(path)
      if (!this.files.has(path)) {
        promises.push(
          this.checker.options
            .provideFile(path)
            .catch(err =>
              err instanceof Error
                ? err
                : new TypeError('`provideFile` threw a non-Error.'),
            )
            .then(base => this._scanFile(path, { base, imports: [] })),
        )
      }
    }
    await Promise.all(promises)
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
   */
  provideFile(path: string): Promise<Base>
}

export class TypeChecker {
  options: CheckerOptions

  constructor (options: CheckerOptions) {
    this.options = options
  }

  async start (file: Base, filePath = 'run.n') {
    const getter = new FileGetter(this)
    console.log(await getter.start(file, filePath))
  }
}
