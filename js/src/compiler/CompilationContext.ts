import { generateNames } from '../../test/unit/utils/generate-names'
import { Block } from '../ast'
import { NRecord } from '../type-checker/types/types'
import { CompilationGlobalScope } from './CompilationGlobalScope'

interface HasExports {
  names: Map<string, string>
}

export class CompilationContext {
  helpers = {
    modulo: 'modulo_n',
    assertValue: 'assertValue_n',
  }

  valueAssertions = 0

  /** Maps module absolute paths to their scopes */
  modules: Record<string, HasExports> = {}

  globalScope = new CompilationGlobalScope(this)

  private _id = 0

  private _recordCache: Map<string, Record<string, string>> = new Map()

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

  compile (block: Block, moduleId?: string): string[] {
    const scope = this.globalScope.inner()
    if (moduleId) {
      this.modules[moduleId] = scope
    }
    return block.compileStatement(scope).statements
  }
}
