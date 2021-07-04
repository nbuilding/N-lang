import { CompilationContext } from './CompilationContext'

export class CompilationScope {
  context: CompilationContext

  /**
   * Mapping of the variable names in the scope from those from the original N
   * code to their compiled names. (eg wow -> wow_0)
   */
  names: Map<string, string> = new Map()

  private _parent?: CompilationScope

  constructor (context: CompilationContext, parent?: CompilationScope) {
    this.context = context
    this._parent = parent
  }

  getName (name: string): string {
    const varName = this.names.get(name)
    if (varName) {
      return varName
    } else if (this._parent) {
      return this._parent.getName(name)
    } else {
      throw new ReferenceError(`Cannot get name ${name}`)
    }
  }

  inner (): CompilationScope {
    return new CompilationScope(this.context, this)
  }
}
