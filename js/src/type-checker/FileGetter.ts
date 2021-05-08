import { Base, Block, ImportFile } from '../ast/index'
import { TypeChecker } from './TypeChecker'

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
  base: Block | Error

  /** Absolute paths to imported files */
  imports: string[]
}

export class FileGetter {
  files: Map<string, FileImports> = new Map()
  checker: TypeChecker

  constructor (checker: TypeChecker) {
    this.checker = checker
  }

  async start (
    file: Block,
    filePath: string,
  ): Promise<Map<string, FileImports>> {
    await this._scanFile(filePath, { base: file, imports: [] })
    return this.files
  }

  private async _getFile (path: string): Promise<void> {
    const base = await this.checker.options
      .provideFile(path)
      .catch(err =>
        err instanceof Error
          ? err
          : new TypeError('`provideFile` threw a non-Error.'),
      )
    await this._scanFile(path, { base, imports: [] })
  }

  private async _scanFile (filePath: string, file: FileImports): Promise<void> {
    this.files.set(filePath, file)
    if (file.base instanceof Error) return
    const promises = []
    for (const importPath of getImports(file.base)) {
      const path = this.checker.options.resolvePath(filePath, importPath)
      file.imports.push(path)
      if (!this.files.has(path)) {
        promises.push(this._getFile(path))
      }
    }
    await Promise.all(promises)
  }
}
