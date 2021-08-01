import { generateNames } from '../../test/unit/utils/generate-names'
import { Block } from '../ast'
import { modules } from '../native-modules'
import { NRecord } from '../type-checker/types/types'
import { CompilationGlobalScope } from '../global-scope/CompilationGlobalScope'
import { functions } from './functions'

export interface HasExports {
  names: Map<string, string>
}

export class CompilationContext {
  /**
   * The next ID of an `assert value` assertion. This also represents the total
   * number of `assert value` assertions.
   */
  valueAssertions = 0

  /** Maps module IDs to their exported variable names */
  private _modules: Map<string, HasExports> = new Map()

  globalScope = new CompilationGlobalScope(this)

  /** ID used to ensure unique variable names */
  private _id = 0

  /** Cache of normalised record key names */
  private _recordCache: Map<string, Record<string, string>> = new Map()

  /**
   * Functions that have been required and added to `dependencies` already. A
   * mapping between the normal name and the mangled name. (e.g. deepEqual ->
   * deepEqual_0)
   */
  required: Map<string, string> = new Map()

  /**
   * Statements for defining the native module dependencies used in the project.
   */
  dependencies: string[] = []

  genVarName (name: string = '') {
    return `${name}_${this._id++}`
  }

  indent (lines: string[]): string[] {
    return lines.map(line => '  ' + line)
  }

  /** Returns an object map between record field names and mangled names */
  normaliseRecord (recordType: NRecord): Record<string, string> {
    // Normalise keys by alphabetising them to get a unique record ID
    const sortedKeys = [...recordType.types.keys()].sort()
    const recordId = sortedKeys.join(' ')
    const cached = this._recordCache.get(recordId)
    if (cached) {
      return cached
    }
    const mangled: Record<string, string> = {}
    const names = generateNames()
    for (const key of sortedKeys) {
      mangled[key] = names.next().value
    }
    this._recordCache.set(recordId, mangled)
    return mangled
  }

  getModule (moduleId: string): HasExports {
    let module = this._modules.get(moduleId)
    if (!module) {
      if (!modules.hasOwnProperty(moduleId)) {
        throw new Error(`Unknown module ${moduleId}`)
      }
      const { statements, exports } = modules[moduleId].compile(this)
      module = { names: new Map(Object.entries(exports)) }
      this.dependencies.push(...statements)
      this._modules.set(moduleId, module)
    }
    return module
  }

  compile (block: Block, moduleId?: string): string[] {
    const scope = this.globalScope.inner()
    if (moduleId) {
      this._modules.set(moduleId, scope)
    }
    return block.compileStatement(scope).statements
  }

  defineModuleNames (moduleId: string, names: Map<string, string>) {
    this._modules.set(moduleId, { names })
  }

  require (name: string): string {
    const cached = this.required.get(name)
    if (cached) {
      return cached
    } else {
      const mangled = this.genVarName(name)
      if (!functions[name]) {
        throw new ReferenceError(`'${name}' is not in functions.`)
      }
      const lines = functions[name](mangled, required => this.require(required))
      this.dependencies.push(...lines)
      this.required.set(name, mangled)
      return mangled
    }
  }
}
