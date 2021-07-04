import { generateNames } from "../../test/unit/utils/generate-names";
import { Base } from "../ast/base";
import { NRecord, NType } from "../type-checker/types/types";

export class CompilationContext {
  // TODO
  private _typeCache: Map<Base, NType> = new Map()

  private _id = 0

  private _recordCache: Map<string, Record<string, string>> = new Map()

  genVarName (name: string = '') {
    return `${name}_${this._id++}`
  }

  getType (base: Base): NType {
    const type = this._typeCache.get(base)
    if (!type) {
      throw new Error('Why is there no cached type for this?')
    }
    return type
  }

  indent (lines: string[]): string[] {
    return lines.map(line => '  ' + line)
  }

  /** Returns a map between record field names and mangled names */
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
}
