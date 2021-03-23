import { Base, ImportFile } from '../ast/index'

export interface CheckerOptions {
  /**
   * Asynchronously gets an imported file and returns the parsed file and the
   * resolved path name.
   */
  fileProvider(
    basePath: string,
    importPath: string,
  ): Promise<[Base | null, string]>
}

export class TypeChecker {
  options: CheckerOptions

  constructor (options: CheckerOptions) {
    this.options = options
  }

  private _getImports (base: Base, target: Set<string>): Set<string> {
    if (base instanceof ImportFile) {
      target.add(base.getImportPath())
    }
    for (const child of base.children) {
      this._getImports(child, target)
    }
    return target
  }

  async start (file: Base, filename = 'run.n') {
    //
  }
}
